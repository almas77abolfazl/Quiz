import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MatchTimerService } from './match-timer.service';
import { MatchPresenceService } from './match-presence.service';
import {
  MatchStatus,
  AnswerStatus,
  Difficulty,
  QuestionStatus,
  CoinTransactionType,
  MatchSocketErrorCode,
  MatchRoundStartS2CPayload,
  MatchRoundResultS2CPayload,
  MatchEndS2CPayload,
  MatchReconnectS2CPayload,
  MatchCountdownS2CPayload,
  MatchReportClient,
  MatchReportRoundItem,
} from '@quiz/contracts';
import { MatchmakingQueue } from './matchmaking-queue';
import {
  getProductDateKey,
  getSeasonPointsForDifficulty,
  getCoinsForDifficulty,
} from '../quiz/quiz.service';

const TOTAL_ROUNDS = 5;
const ROUND_DEADLINE_MS = 30000;
const FEEDBACK_DELAY_MS = 2000;

class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.lock();
    try {
      return await fn();
    } finally {
      this.unlock();
    }
  }

  private lock(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private unlock(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

export type JoinMatchmakingResult =
  | { status: 'already_matched'; match: any }
  | { status: 'queued'; categoryId?: string; difficulty?: Difficulty }
  | { status: 'matched'; match: any; playerAId: string; playerBId: string };

export interface MatchLifecycleEventListener {
  onMatchCountdown?(payload: MatchCountdownS2CPayload): void;
  onRoundStart(payload: MatchRoundStartS2CPayload): void;
  onRoundResult(
    matchId: string,
    payloads: Array<{ userId: string; payload: MatchRoundResultS2CPayload }>,
  ): void;
  onMatchEnd(payloads: Array<{ userId: string; payload: MatchEndS2CPayload }>): void;
}

@Injectable()
export class MatchService {
  private readonly mutex = new AsyncMutex();
  private eventListener?: MatchLifecycleEventListener;

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchmakingQueue: MatchmakingQueue,
    private readonly timerService: MatchTimerService,
    private readonly presenceService: MatchPresenceService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  registerEventListener(listener: MatchLifecycleEventListener): void {
    this.eventListener = listener;
  }

  getQueue(): MatchmakingQueue {
    return this.matchmakingQueue;
  }

  async processJoinMatchmaking(
    userId: string,
    categoryId?: string,
    difficulty?: Difficulty,
  ): Promise<JoinMatchmakingResult> {
    // 1. Check if user already has a waiting or active match in DB
    const existingMatch = await this.prisma.match.findFirst({
      where: {
        status: { in: [MatchStatus.WAITING, MatchStatus.ACTIVE] },
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarKey: true,
              },
            },
          },
        },
        questions: {
          orderBy: { position: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (existingMatch) {
      return { status: 'already_matched', match: existingMatch };
    }

    // 2. Check if already queued (idempotent join)
    if (await this.matchmakingQueue.isQueued(userId)) {
      return { status: 'queued', categoryId, difficulty };
    }

    // 3. Acquire mutex to safely process queue matching & transaction creation
    return this.mutex.runExclusive(async () => {
      if (await this.matchmakingQueue.isQueued(userId)) {
        return { status: 'queued', categoryId, difficulty };
      }

      const candidate = await this.matchmakingQueue.findAndRemoveCandidate(
        userId,
        categoryId,
        difficulty,
      );

      if (candidate) {
        try {
          const match = await this.createMatchTransaction(
            candidate.userId,
            userId,
            categoryId,
            difficulty,
          );
          return {
            status: 'matched',
            match,
            playerAId: candidate.userId,
            playerBId: userId,
          };
        } catch (err) {
          await this.matchmakingQueue.enqueue(candidate);
          throw err;
        }
      }

      await this.matchmakingQueue.enqueue({
        userId,
        categoryId,
        difficulty,
        joinedAt: new Date(),
      });

      return { status: 'queued', categoryId, difficulty };
    });
  }

  async setPlayerReady(matchId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.matchParticipant.findFirst({
      where: { matchId, userId },
    });
    if (!participant) {
      throw new NotFoundException({
        code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        message: 'User is not a participant in this match',
      });
    }

    // Atomic update to set isReady = true
    await this.prisma.matchParticipant.updateMany({
      where: { matchId, userId, isReady: false },
      data: { isReady: true },
    });

    // Check readiness of both participants
    const readyCount = await this.prisma.matchParticipant.count({
      where: { matchId, isReady: true },
    });

    if (readyCount >= 2) {
      const now = new Date();
      // Transition match status to ACTIVE with currentRound: 0 (countdown phase)
      const updateResult = await this.prisma.match.updateMany({
        where: { id: matchId, status: MatchStatus.WAITING },
        data: {
          status: MatchStatus.ACTIVE,
          currentRound: 0,
          startedAt: now,
        },
      });

      if (updateResult.count === 1) {
        const match = await this.prisma.match.findUnique({
          where: { id: matchId },
        });

        let categoryTitle: string | null = null;
        if (match?.categoryId) {
          const cat = await this.prisma.category.findUnique({ where: { id: match.categoryId } });
          categoryTitle = cat?.title ?? null;
        }

        const countdownDeadlineAt = new Date(now.getTime() + 3000).toISOString();
        const payload: MatchCountdownS2CPayload = {
          matchId,
          countdownSeconds: 3,
          serverNow: now.toISOString(),
          countdownDeadlineAt,
          categoryId: match?.categoryId ?? null,
          categoryTitle,
          difficulty: (match?.difficulty as Difficulty | null) ?? null,
        };

        if (this.eventListener?.onMatchCountdown) {
          this.eventListener.onMatchCountdown(payload);
        }

        this.timerService.scheduleTransition(matchId, 0, 3000, () => {
          this.startRound(matchId, 1).catch((err) => {
            console.error(`Error starting round 1 after countdown for match ${matchId}:`, err);
          });
        });

        return true;
      }
    }

    return false;
  }

  async startRound(
    matchId: string,
    roundNumber: number,
  ): Promise<MatchRoundStartS2CPayload | null> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        questions: {
          where: { position: roundNumber },
          include: { question: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
        },
      },
    });

    if (!match || match.status !== MatchStatus.ACTIVE || match.questions.length === 0) {
      return null;
    }

    if (roundNumber > 1) {
      const transitionResult = await this.prisma.match.updateMany({
        where: { id: matchId, status: MatchStatus.ACTIVE, currentRound: roundNumber - 1 },
        data: { currentRound: roundNumber },
      });
      if (transitionResult.count === 0) {
        return null;
      }
    } else {
      const transitionResult = await this.prisma.match.updateMany({
        where: { id: matchId, status: MatchStatus.ACTIVE, currentRound: 0 },
        data: { currentRound: 1 },
      });
      if (transitionResult.count === 0) {
        const currentMatch = await this.prisma.match.findUnique({ where: { id: matchId } });
        if (!currentMatch || currentMatch.currentRound !== 1) {
          return null;
        }
      }
    }

    const now = new Date();
    const deadlineAt = new Date(now.getTime() + ROUND_DEADLINE_MS);
    const matchQuestion = match.questions[0];

    await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: { currentRound: roundNumber },
      }),
      this.prisma.matchQuestion.update({
        where: { id: matchQuestion.id },
        data: { startsAt: now, deadlineAt },
      }),
    ]);

    let categoryTitle: string | null = null;
    if (match.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: match.categoryId } });
      categoryTitle = cat?.title ?? null;
    }

    const payload: MatchRoundStartS2CPayload = {
      matchId,
      round: roundNumber,
      totalRounds: TOTAL_ROUNDS,
      question: {
        matchQuestionId: matchQuestion.id,
        questionId: matchQuestion.question.id,
        text: matchQuestion.question.text,
        imageKey: matchQuestion.question.imageKey ?? null,
        position: roundNumber,
        options: matchQuestion.question.options.map((o) => ({
          id: o.id,
          text: o.text,
        })),
      },
      serverNow: now.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      categoryId: match.categoryId ?? null,
      categoryTitle,
      difficulty: (match.difficulty as Difficulty | null) ?? null,
    };

    // Schedule 30-second deadline timer
    this.timerService.scheduleDeadline(matchId, roundNumber, ROUND_DEADLINE_MS, () => {
      this.closeRound(matchId, roundNumber).catch((err) => {
        console.error(`Error closing round ${roundNumber} for match ${matchId}:`, err);
      });
    });

    if (this.eventListener) {
      this.eventListener.onRoundStart(payload);
    }

    return payload;
  }

  async submitAnswer(
    matchId: string,
    userId: string,
    matchQuestionId: string,
    selectedOptionId?: string,
  ) {
    const participant = await this.prisma.matchParticipant.findFirst({
      where: { matchId, userId },
    });
    if (!participant) {
      throw new NotFoundException({
        code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        message: 'Participant not found',
      });
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        questions: {
          where: { id: matchQuestionId },
          include: { question: { include: { options: true } } },
        },
      },
    });

    if (!match || match.status !== MatchStatus.ACTIVE || match.questions.length === 0) {
      throw new BadRequestException({
        code: MatchSocketErrorCode.ROUND_NOT_ACTIVE,
        message: 'Match or round is not currently active',
      });
    }

    const matchQuestion = match.questions[0];

    // Enforce active round boundary
    if (matchQuestion.position !== match.currentRound || matchQuestion.closedAt !== null) {
      throw new BadRequestException({
        code: MatchSocketErrorCode.ROUND_NOT_ACTIVE,
        message: 'This question is not in the active round',
      });
    }

    // Check idempotency / already answered
    const existingAnswer = await this.prisma.matchAnswer.findFirst({
      where: { matchQuestionId, participantId: participant.id },
    });

    if (existingAnswer) {
      return {
        status: existingAnswer.status,
        isCorrect: existingAnswer.status === AnswerStatus.CORRECT,
        participantId: participant.id,
        alreadyAnswered: true,
      };
    }

    const now = new Date();
    let status = AnswerStatus.PENDING;

    if (now > matchQuestion.deadlineAt) {
      status = AnswerStatus.TIMED_OUT;
    } else if (selectedOptionId) {
      const validOption = matchQuestion.question.options.find((opt) => opt.id === selectedOptionId);
      if (!validOption) {
        status = AnswerStatus.INCORRECT;
      } else {
        status = validOption.isCorrect ? AnswerStatus.CORRECT : AnswerStatus.INCORRECT;
      }
    } else {
      status = AnswerStatus.INCORRECT;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.matchAnswer.create({
        data: {
          matchQuestionId,
          participantId: participant.id,
          selectedOptionId:
            selectedOptionId && status !== AnswerStatus.TIMED_OUT ? selectedOptionId : null,
          answeredAt: now,
          status,
        },
      });

      if (status === AnswerStatus.CORRECT) {
        await tx.matchParticipant.update({
          where: { id: participant.id },
          data: { score: { increment: 10 } },
        });
      }
    });

    const answersCount = await this.prisma.matchAnswer.count({
      where: { matchQuestionId },
    });

    if (answersCount >= 2) {
      // Both participants have answered; cancel deadline timer and close round early
      this.timerService.cancelTimer(matchId, matchQuestion.position, 'deadline');
      setImmediate(() => {
        this.closeRound(matchId, matchQuestion.position).catch(() => {});
      });
    }

    return {
      status,
      isCorrect: status === AnswerStatus.CORRECT,
      participantId: participant.id,
      alreadyAnswered: false,
    };
  }

  async closeRound(matchId: string, roundNumber: number): Promise<boolean> {
    const now = new Date();

    // Persist round closure state atomically. Exactly one caller will succeed.
    const updateResult = await this.prisma.matchQuestion.updateMany({
      where: {
        matchId,
        position: roundNumber,
        closedAt: null,
      },
      data: { closedAt: now },
    });

    if (updateResult.count === 0) {
      // Duplicate callback / already closed
      return false;
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: { include: { answers: true } },
        questions: {
          where: { position: roundNumber },
          include: {
            question: { include: { options: true } },
            answers: true,
          },
        },
      },
    });

    if (!match || match.questions.length === 0) return false;

    const matchQuestion = match.questions[0];

    // Persist timeouts for any participant who has not answered
    for (const p of match.participants) {
      const hasAnswer = matchQuestion.answers.some((a) => a.participantId === p.id);
      if (!hasAnswer) {
        await this.prisma.matchAnswer
          .create({
            data: {
              matchQuestionId: matchQuestion.id,
              participantId: p.id,
              selectedOptionId: null,
              answeredAt: now,
              status: AnswerStatus.TIMED_OUT,
            },
          })
          .catch(() => {
            // Ignore if concurrently inserted
          });
      }
    }

    // Refetch fresh participant and answer data
    const updatedMatch = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: { include: { answers: { where: { matchQuestionId: matchQuestion.id } } } },
      },
    });

    if (!updatedMatch || updatedMatch.participants.length < 2) return false;

    const correctOption = matchQuestion.question.options.find((o) => o.isCorrect);
    const correctOptionId = correctOption?.id ?? '';

    const pA = updatedMatch.participants[0];
    const pB = updatedMatch.participants[1];

    const ansA = pA.answers[0];
    const ansB = pB.answers[0];

    const diff = (match.difficulty ?? Difficulty.MEDIUM) as Difficulty;
    const pts = getSeasonPointsForDifficulty(diff);
    const pointsA = ansA?.status === AnswerStatus.CORRECT ? pts : 0;
    const pointsB = ansB?.status === AnswerStatus.CORRECT ? pts : 0;

    const resultForA: MatchRoundResultS2CPayload = {
      matchId,
      round: roundNumber,
      correctOptionId,
      yourScore: pA.score,
      opponentScore: pB.score,
      yourStatus: (ansA?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus,
      opponentStatus: (ansB?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus,
      yourSelectedOptionId: ansA?.selectedOptionId ?? null,
      opponentSelectedOptionId: ansB?.selectedOptionId ?? null,
      yourPointsEarned: pointsA,
    };

    const resultForB: MatchRoundResultS2CPayload = {
      matchId,
      round: roundNumber,
      correctOptionId,
      yourScore: pB.score,
      opponentScore: pA.score,
      yourStatus: (ansB?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus,
      opponentStatus: (ansA?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus,
      yourSelectedOptionId: ansB?.selectedOptionId ?? null,
      opponentSelectedOptionId: ansA?.selectedOptionId ?? null,
      yourPointsEarned: pointsB,
    };

    if (this.eventListener) {
      this.eventListener.onRoundResult(matchId, [
        { userId: pA.userId, payload: resultForA },
        { userId: pB.userId, payload: resultForB },
      ]);
    }

    if (roundNumber < TOTAL_ROUNDS) {
      this.timerService.scheduleTransition(matchId, roundNumber + 1, FEEDBACK_DELAY_MS, () => {
        this.startRound(matchId, roundNumber + 1).catch(() => {});
      });
    } else {
      this.timerService.scheduleTransition(matchId, TOTAL_ROUNDS, FEEDBACK_DELAY_MS, () => {
        this.completeMatch(matchId).catch(() => {});
      });
    }

    return true;
  }

  getDailyRankedGameLimit(): number {
    if (this.config && typeof this.config.get === 'function') {
      const raw =
        this.config.get<string | number>('DAILY_RANKED_GAME_LIMIT') ??
        this.config.get<string | number>('DAILY_MATCH_RANKED_LIMIT');
      if (raw !== undefined && raw !== null && raw !== '') {
        const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return 15;
  }

  private buildMatchReportForParticipant(
    match: any,
    participantId: string,
    opponentParticipantId: string,
  ): MatchReportClient {
    const report: MatchReportRoundItem[] = [];
    const sortedQuestions = [...(match.questions || [])].sort((a, b) => a.position - b.position);

    for (const mq of sortedQuestions) {
      const q = mq.question || {};
      const options: any[] = (q.options || []).map((o: any) => ({
        id: o.id,
        text: o.text,
      }));
      const correctOpt = (q.options || []).find((o: any) => o.isCorrect);

      const yourAns = (mq.answers || []).find((a: any) => a.participantId === participantId);
      const oppAns = (mq.answers || []).find((a: any) => a.participantId === opponentParticipantId);

      const yourSelectedOpt = yourAns?.selectedOptionId
        ? options.find((o) => o.id === yourAns.selectedOptionId)
        : null;
      const oppSelectedOpt = oppAns?.selectedOptionId
        ? options.find((o) => o.id === oppAns.selectedOptionId)
        : null;

      const diff = (q.difficulty ?? match.difficulty ?? Difficulty.MEDIUM) as Difficulty;
      const ptsForDiff = getSeasonPointsForDifficulty(diff);

      const yourStatus = (yourAns?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus;
      const opponentStatus = (oppAns?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus;

      report.push({
        round: mq.position,
        questionId: q.id ?? '',
        questionText: q.text ?? '',
        correctOptionId: correctOpt?.id ?? '',
        correctOptionText: correctOpt?.text ?? '',
        options,
        yourSelectedOptionId: yourAns?.selectedOptionId ?? null,
        yourSelectedOptionText: yourSelectedOpt?.text ?? null,
        yourStatus,
        yourPointsEarned: yourStatus === AnswerStatus.CORRECT ? ptsForDiff : 0,
        opponentSelectedOptionId: oppAns?.selectedOptionId ?? null,
        opponentSelectedOptionText: oppSelectedOpt?.text ?? null,
        opponentStatus,
        opponentPointsEarned: opponentStatus === AnswerStatus.CORRECT ? ptsForDiff : 0,
      });
    }

    return report;
  }

  async completeMatch(matchId: string): Promise<boolean> {
    return this.settleMatch(matchId);
  }

  async settleMatch(matchId: string): Promise<boolean> {
    const limit = this.getDailyRankedGameLimit();
    const dateKey = getProductDateKey();
    let settlementEvents: Array<{ userId: string; payload: MatchEndS2CPayload }> = [];

    const settledSuccess = await this.prisma.$transaction(async (tx: any) => {
      // 1. Lock Match row inside transaction before checking settledAt
      let isAlreadySettled = false;
      if (typeof tx.$queryRaw === 'function') {
        try {
          const lockedMatch = await tx.$queryRaw<
            Array<{ id: string; settledAt: Date | null; status: string }>
          >`
            SELECT id, "settledAt", status
            FROM "Match"
            WHERE id = ${matchId}
            FOR UPDATE
          `;
          if (lockedMatch && lockedMatch.length > 0 && lockedMatch[0].settledAt != null) {
            isAlreadySettled = true;
          }
        } catch {
          const m = await tx.match.findUnique({ where: { id: matchId } });
          if (m?.settledAt != null) {
            isAlreadySettled = true;
          }
        }
      } else {
        const m = await tx.match.findUnique({ where: { id: matchId } });
        if (m?.settledAt != null) {
          isAlreadySettled = true;
        }
      }

      if (isAlreadySettled) {
        return false;
      }

      // Fetch full match data including answers & options
      const match = await tx.match.findUnique({
        where: { id: matchId },
        include: {
          participants: {
            include: {
              answers: {
                include: {
                  matchQuestion: {
                    include: {
                      question: true,
                    },
                  },
                },
              },
            },
          },
          questions: {
            include: {
              question: true,
              answers: true,
            },
          },
        },
      });

      if (!match || match.participants.length < 2) return false;

      if (match.settledAt != null || match.participants.every((p: any) => p.settledAt != null)) {
        return false;
      }

      const pA = match.participants[0];
      const pB = match.participants[1];

      const getParticipantAnswersSummary = (p: typeof pA) => {
        let correctCount = 0;
        let seasonPointsFromAnswers = 0;
        let coinsFromAnswers = 0;

        for (const ans of p.answers) {
          if (ans.status === AnswerStatus.CORRECT) {
            correctCount++;
            const diff = (ans.matchQuestion?.question?.difficulty ??
              match.difficulty ??
              Difficulty.MEDIUM) as Difficulty;
            seasonPointsFromAnswers += getSeasonPointsForDifficulty(diff);
            coinsFromAnswers += getCoinsForDifficulty(diff);
          }
        }

        if (p.answers.length === 0 && p.score > 0) {
          correctCount = p.score;
          const diff = (match.difficulty ?? Difficulty.MEDIUM) as Difficulty;
          seasonPointsFromAnswers = correctCount * getSeasonPointsForDifficulty(diff);
          coinsFromAnswers = correctCount * getCoinsForDifficulty(diff);
        }

        return { correctCount, seasonPointsFromAnswers, coinsFromAnswers };
      };

      const sumA = getParticipantAnswersSummary(pA);
      const sumB = getParticipantAnswersSummary(pB);

      let winnerId: string | null = null;
      let isDraw = false;
      let bonusSeasonPointsA = 0;
      let bonusSeasonPointsB = 0;

      if (sumA.correctCount > sumB.correctCount) {
        winnerId = pA.userId;
        bonusSeasonPointsA = 3;
      } else if (sumB.correctCount > sumA.correctCount) {
        winnerId = pB.userId;
        bonusSeasonPointsB = 3;
      } else {
        isDraw = true;
        bonusSeasonPointsA = 1;
        bonusSeasonPointsB = 1;
      }

      // Process participants in deterministic userId order to prevent deadlocks when locking DailyUsage rows
      const participantsList = [
        {
          participant: pA,
          sum: sumA,
          isWinner: winnerId === pA.userId,
          bonusSeasonPoints: bonusSeasonPointsA,
        },
        {
          participant: pB,
          sum: sumB,
          isWinner: winnerId === pB.userId,
          bonusSeasonPoints: bonusSeasonPointsB,
        },
      ];

      const sortedParticipants = [...participantsList].sort((a, b) =>
        a.participant.userId.localeCompare(b.participant.userId),
      );

      const settlementResultsMap = new Map<
        string,
        {
          coinsEarned: number;
          seasonPointsEarned: number;
          isRankedMatch: boolean;
          dailyRankedMatchesUsed: number;
          dailyRankedMatchesRemaining: number;
          correctCount: number;
          isWinner: boolean;
        }
      >();

      for (const item of sortedParticipants) {
        const uId = item.participant.userId;

        // Lock DailyUsage row for this user
        if (tx.dailyUsage?.upsert) {
          await tx.dailyUsage.upsert({
            where: { userId_dateKey: { userId: uId, dateKey } },
            create: { userId: uId, dateKey, soloRankedCount: 0, matchRankedCount: 0 },
            update: {},
          });
        }

        let currentTotal = 0;
        if (typeof tx.$queryRaw === 'function') {
          try {
            const lockedUsages = await tx.$queryRaw<
              Array<{ id: string; soloRankedCount: number; matchRankedCount: number }>
            >`
              SELECT id, "soloRankedCount", "matchRankedCount"
              FROM "DailyUsage"
              WHERE "userId" = ${uId} AND "dateKey" = ${dateKey}
              FOR UPDATE
            `;
            if (lockedUsages && lockedUsages.length > 0) {
              currentTotal = lockedUsages[0].soloRankedCount + lockedUsages[0].matchRankedCount;
            } else if (tx.dailyUsage?.findUnique) {
              const usage = await tx.dailyUsage.findUnique({
                where: { userId_dateKey: { userId: uId, dateKey } },
              });
              currentTotal = (usage?.soloRankedCount ?? 0) + (usage?.matchRankedCount ?? 0);
            }
          } catch {
            if (tx.dailyUsage?.findUnique) {
              const usage = await tx.dailyUsage.findUnique({
                where: { userId_dateKey: { userId: uId, dateKey } },
              });
              currentTotal = (usage?.soloRankedCount ?? 0) + (usage?.matchRankedCount ?? 0);
            }
          }
        } else if (tx.dailyUsage?.findUnique) {
          const usage = await tx.dailyUsage.findUnique({
            where: { userId_dateKey: { userId: uId, dateKey } },
          });
          currentTotal = (usage?.soloRankedCount ?? 0) + (usage?.matchRankedCount ?? 0);
        }

        const isRanked = currentTotal < limit;
        const coinsEarned = item.sum.coinsFromAnswers; // Result bonus coins = 0
        let seasonPointsEarned = 0;
        let dailyRankedMatchesUsed = currentTotal;

        if (isRanked) {
          seasonPointsEarned = item.sum.seasonPointsFromAnswers + item.bonusSeasonPoints;
          dailyRankedMatchesUsed = currentTotal + 1;

          if (tx.dailyUsage?.update) {
            await tx.dailyUsage.update({
              where: { userId_dateKey: { userId: uId, dateKey } },
              data: { matchRankedCount: { increment: 1 } },
            });
          }

          // Update SeasonEntry if active season exists
          const currentSeason = tx.season?.findFirst
            ? await tx.season.findFirst({
                where: { isActive: true },
              })
            : null;

          if (currentSeason && tx.seasonEntry) {
            const existing = tx.seasonEntry.findFirst
              ? await tx.seasonEntry.findFirst({
                  where: { seasonId: currentSeason.id, userId: uId },
                })
              : null;

            if (!existing && tx.seasonEntry.create) {
              await tx.seasonEntry.create({
                data: {
                  seasonId: currentSeason.id,
                  userId: uId,
                  score: seasonPointsEarned,
                  correctAnswers: item.sum.correctCount,
                  matchWins: item.isWinner ? 1 : 0,
                  reachedScoreAt: new Date(),
                },
              });
            } else if (existing && tx.seasonEntry.update) {
              await tx.seasonEntry.update({
                where: { id: existing.id },
                data: {
                  score: { increment: seasonPointsEarned },
                  correctAnswers: { increment: item.sum.correctCount },
                  ...(item.isWinner ? { matchWins: { increment: 1 } } : {}),
                  reachedScoreAt: new Date(),
                },
              });
            }
          }
        }

        // Increment User coins
        if (tx.user?.update) {
          await tx.user.update({
            where: { id: uId },
            data: { coins: { increment: coinsEarned } },
          });
        }

        // Create CoinTransaction with dedicated idempotencyKey
        if (tx.coinTransaction?.create) {
          await tx.coinTransaction.create({
            data: {
              userId: uId,
              amount: coinsEarned,
              type: CoinTransactionType.MATCH_REWARD,
              referenceType: 'MatchParticipant',
              referenceId: item.participant.id,
              idempotencyKey: `match:${item.participant.id}`,
              note: `Match ${matchId} settlement reward: ${coinsEarned} coins, ${seasonPointsEarned} season points`,
            },
          });
        }

        // Update MatchParticipant settlement fields
        if (tx.matchParticipant?.update) {
          await tx.matchParticipant.update({
            where: { id: item.participant.id },
            data: {
              score: item.sum.correctCount,
              coinReward: coinsEarned,
              seasonPointsEarned,
              isWinner: item.isWinner,
              isRanked,
              settledAt: new Date(),
            },
          });
        }

        const dailyRankedMatchesRemaining = Math.max(0, limit - dailyRankedMatchesUsed);

        settlementResultsMap.set(uId, {
          coinsEarned,
          seasonPointsEarned,
          isRankedMatch: isRanked,
          dailyRankedMatchesUsed,
          dailyRankedMatchesRemaining,
          correctCount: item.sum.correctCount,
          isWinner: item.isWinner,
        });
      }

      const now = new Date();

      // Mark Match as settled only after all participant rewards and metadata succeed
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.COMPLETED,
          completedAt: now,
          settledAt: now,
        },
      });

      const resA = settlementResultsMap.get(pA.userId)!;
      const resB = settlementResultsMap.get(pB.userId)!;

      const reportForA = this.buildMatchReportForParticipant(match, pA.id, pB.id);
      const reportForB = this.buildMatchReportForParticipant(match, pB.id, pA.id);

      const endForA: MatchEndS2CPayload = {
        matchId,
        winnerId,
        yourScore: resA.correctCount,
        opponentScore: resB.correctCount,
        isDraw,
        coinsEarned: resA.coinsEarned,
        seasonPointsEarned: resA.seasonPointsEarned,
        isRankedMatch: resA.isRankedMatch,
        dailyRankedMatchesUsed: resA.dailyRankedMatchesUsed,
        dailyRankedMatchesLimit: limit,
        dailyRankedMatchesRemaining: resA.dailyRankedMatchesRemaining,
        matchReport: reportForA,
      };

      const endForB: MatchEndS2CPayload = {
        matchId,
        winnerId,
        yourScore: resB.correctCount,
        opponentScore: resA.correctCount,
        isDraw,
        coinsEarned: resB.coinsEarned,
        seasonPointsEarned: resB.seasonPointsEarned,
        isRankedMatch: resB.isRankedMatch,
        dailyRankedMatchesUsed: resB.dailyRankedMatchesUsed,
        dailyRankedMatchesLimit: limit,
        dailyRankedMatchesRemaining: resB.dailyRankedMatchesRemaining,
        matchReport: reportForB,
      };

      settlementEvents = [
        { userId: pA.userId, payload: endForA },
        { userId: pB.userId, payload: endForB },
      ];

      return true;
    });

    if (settledSuccess && settlementEvents.length > 0 && this.eventListener) {
      this.eventListener.onMatchEnd(settlementEvents);
    }

    this.timerService.cancelAllTimersForMatch(matchId);
    return settledSuccess;
  }

  async leaveMatchmaking(userId: string): Promise<{ status: 'left' }> {
    await this.matchmakingQueue.dequeue(userId);
    return { status: 'left' };
  }

  async isQueued(userId: string): Promise<boolean> {
    return this.matchmakingQueue.isQueued(userId);
  }

  async isParticipant(matchId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.matchParticipant.count({
      where: { matchId, userId },
    });
    return count > 0;
  }

  async getHistory(userId: string) {
    return this.prisma.match.findMany({
      where: {
        participants: { some: { userId } },
        status: { in: [MatchStatus.COMPLETED, MatchStatus.CANCELLED] },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: {
        participants: { include: { user: true } },
      },
    });
  }

  private async createMatchTransaction(
    playerAId: string,
    playerBId: string,
    categoryId?: string,
    difficulty?: Difficulty,
  ) {
    const where: any = {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    };
    if (categoryId) {
      where.categories = { some: { categoryId } };
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }

    const eligibleQuestions = await this.prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (eligibleQuestions.length < TOTAL_ROUNDS) {
      throw new BadRequestException({
        code: MatchSocketErrorCode.INSUFFICIENT_QUESTIONS,
        message: 'Not enough eligible published questions available',
      });
    }

    const selectedQuestions = this.shuffleArray(eligibleQuestions).slice(0, TOTAL_ROUNDS);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          categoryId,
          difficulty,
          status: MatchStatus.WAITING,
          currentRound: 0,
          participants: {
            create: [{ userId: playerAId }, { userId: playerBId }],
          },
          questions: {
            create: selectedQuestions.map((q, index) => ({
              questionId: q.id,
              position: index + 1,
              startsAt: now,
              deadlineAt: now,
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarKey: true,
                },
              },
            },
          },
          questions: {
            orderBy: { position: 'asc' },
            include: {
              question: {
                include: {
                  options: { orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
        },
      });

      return match;
    });
  }

  // Legacy helper methods for backward compatibility
  async joinMatchmaking(userId: string, categoryId?: string, difficulty?: Difficulty) {
    const res = await this.processJoinMatchmaking(userId, categoryId, difficulty);
    if (res.status === 'already_matched' || res.status === 'matched') return res.match;
    return null;
  }

  async startMatch(matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId },
      include: {
        participants: { include: { user: true } },
        questions: { include: { question: { include: { options: true } } } },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async getReconnectSnapshot(matchId: string, userId: string): Promise<MatchReconnectS2CPayload> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarKey: true,
              },
            },
            answers: true,
          },
        },
        questions: {
          orderBy: { position: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { sortOrder: 'asc' } },
              },
            },
            answers: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException({
        code: MatchSocketErrorCode.MATCH_NOT_FOUND,
        message: 'Match not found',
      });
    }

    const me = match.participants.find((p) => p.userId === userId);
    if (!me) {
      throw new NotFoundException({
        code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        message: 'Authenticated user is not a participant in this match',
      });
    }

    const opponentPart = match.participants.find((p) => p.userId !== userId);
    const now = new Date();

    const opponent = opponentPart
      ? {
          userId: opponentPart.user.id,
          username: opponentPart.user.username ?? null,
          displayName: opponentPart.user.displayName ?? null,
          avatarKey: opponentPart.user.avatarKey ?? null,
          isOnline: this.presenceService.isUserConnected(opponentPart.userId),
        }
      : null;

    let categoryTitle: string | null = null;
    if (match.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: match.categoryId } });
      categoryTitle = cat?.title ?? null;
    }

    const basePayload = {
      matchId: match.id,
      matchStatus: match.status as unknown as MatchStatus,
      currentRound: match.currentRound,
      totalRounds: TOTAL_ROUNDS,
      yourScore: me.score,
      opponentScore: opponentPart ? opponentPart.score : 0,
      serverNow: now.toISOString(),
      opponent,
      categoryId: match.categoryId ?? null,
      categoryTitle,
      difficulty: (match.difficulty as Difficulty | null) ?? null,
    };

    if (match.status === MatchStatus.WAITING) {
      return {
        ...basePayload,
        phase: 'WAITING',
      };
    }

    if (match.status === MatchStatus.COMPLETED || match.status === MatchStatus.CANCELLED) {
      const winnerPart = match.participants.find((p) => p.isWinner);
      const winnerId = winnerPart ? winnerPart.userId : null;
      const isDraw =
        !winnerPart &&
        match.participants.length >= 2 &&
        match.participants[0].score === match.participants[1].score;

      const limit = this.getDailyRankedGameLimit();
      const dateKey = getProductDateKey();

      const userUsage = this.prisma.dailyUsage?.findUnique
        ? await this.prisma.dailyUsage.findUnique({
            where: { userId_dateKey: { userId, dateKey } },
          })
        : null;
      const dailyRankedMatchesUsed =
        (userUsage?.soloRankedCount ?? 0) + (userUsage?.matchRankedCount ?? 0);
      const dailyRankedMatchesRemaining = Math.max(0, limit - dailyRankedMatchesUsed);

      const matchReport = opponentPart
        ? this.buildMatchReportForParticipant(match, me.id, opponentPart.id)
        : [];

      const finalResult: MatchEndS2CPayload = {
        matchId: match.id,
        winnerId,
        yourScore: me.score,
        opponentScore: opponentPart ? opponentPart.score : 0,
        isDraw,
        coinsEarned: me.coinReward,
        seasonPointsEarned: me.seasonPointsEarned,
        isRankedMatch: me.isRanked,
        dailyRankedMatchesUsed,
        dailyRankedMatchesLimit: limit,
        dailyRankedMatchesRemaining,
        matchReport,
      };

      return {
        ...basePayload,
        phase: 'COMPLETED',
        finalResult,
      };
    }

    // Active match
    if (match.currentRound === 0) {
      const startedAtTime = match.startedAt ? match.startedAt.getTime() : now.getTime();
      const countdownDeadlineAt = new Date(startedAtTime + 3000).toISOString();
      return {
        ...basePayload,
        phase: 'COUNTDOWN',
        countdownDeadlineAt,
      };
    }

    const currentMatchQuestion = match.questions.find((q) => q.position === match.currentRound);

    if (!currentMatchQuestion) {
      return {
        ...basePayload,
        phase: 'WAITING',
      };
    }

    const isOpen = currentMatchQuestion.closedAt === null && now <= currentMatchQuestion.deadlineAt;

    if (isOpen) {
      const myAns = currentMatchQuestion.answers.find((a) => a.participantId === me.id);

      return {
        ...basePayload,
        phase: 'ACTIVE_ROUND',
        deadlineAt: currentMatchQuestion.deadlineAt.toISOString(),
        question: {
          matchQuestionId: currentMatchQuestion.id,
          questionId: currentMatchQuestion.question.id,
          text: currentMatchQuestion.question.text,
          imageKey: currentMatchQuestion.question.imageKey ?? null,
          position: currentMatchQuestion.position,
          options: currentMatchQuestion.question.options.map((o) => ({
            id: o.id,
            text: o.text,
          })),
        },
        yourAnswerState: {
          answered: !!myAns,
          selectedOptionId: myAns?.selectedOptionId ?? null,
          status: (myAns?.status ?? null) as unknown as AnswerStatus | null,
        },
      };
    }

    // Round is closed, but next round has not started yet (ROUND_RESULT phase)
    const closedAt = currentMatchQuestion.closedAt ?? now;
    const transitionTime = new Date(closedAt.getTime() + FEEDBACK_DELAY_MS);

    const correctOption = currentMatchQuestion.question.options.find((o) => o.isCorrect);
    const correctOptionId = correctOption?.id ?? '';

    const myAns = me.answers.find((a) => a.matchQuestionId === currentMatchQuestion.id);
    const oppAns = opponentPart
      ? opponentPart.answers.find((a) => a.matchQuestionId === currentMatchQuestion.id)
      : null;

    const diff = (match.difficulty ?? Difficulty.MEDIUM) as Difficulty;
    const pts = getSeasonPointsForDifficulty(diff);
    const pointsEarned = myAns?.status === AnswerStatus.CORRECT ? pts : 0;

    const roundResult: MatchRoundResultS2CPayload = {
      matchId: match.id,
      round: match.currentRound,
      correctOptionId,
      yourScore: me.score,
      opponentScore: opponentPart ? opponentPart.score : 0,
      yourStatus: (myAns?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus,
      opponentStatus: (oppAns?.status ?? AnswerStatus.TIMED_OUT) as AnswerStatus,
      yourSelectedOptionId: myAns?.selectedOptionId ?? null,
      opponentSelectedOptionId: oppAns?.selectedOptionId ?? null,
      yourPointsEarned: pointsEarned,
    };

    return {
      ...basePayload,
      phase: 'ROUND_RESULT',
      transitionDeadlineAt: transitionTime.toISOString(),
      roundResult,
    };
  }

  async recoverActiveMatches(): Promise<void> {
    const activeMatches = await this.prisma.match.findMany({
      where: { status: MatchStatus.ACTIVE },
      include: {
        questions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    const uncompletedOrUnsettled = [...activeMatches];
    try {
      const unsettled = await this.prisma.match.findMany({
        where: { status: MatchStatus.COMPLETED, settledAt: null },
        include: {
          questions: { orderBy: { position: 'asc' } },
        },
      });
      uncompletedOrUnsettled.push(...unsettled);
    } catch {
      // Ignore if mock doesn't support settledAt filter
    }

    const now = new Date();

    for (const match of uncompletedOrUnsettled) {
      if (match.status === MatchStatus.COMPLETED && match.settledAt === null) {
        await this.settleMatch(match.id).catch((err) => {
          console.error(
            `Error settling uncompleted match ${match.id} during startup recovery:`,
            err,
          );
        });
        continue;
      }

      const roundNumber = match.currentRound;
      if (roundNumber === 0) {
        const startedAtTime = match.startedAt ? match.startedAt.getTime() : now.getTime();
        const remainingMs = startedAtTime + 3000 - now.getTime();
        if (remainingMs > 0) {
          this.timerService.scheduleTransition(match.id, 0, remainingMs, () => {
            this.startRound(match.id, 1).catch((err) => {
              console.error(
                `Error starting round 1 after recovered countdown for match ${match.id}:`,
                err,
              );
            });
          });
        } else {
          this.startRound(match.id, 1).catch((err) => {
            console.error(
              `Error starting round 1 after expired countdown recovery for match ${match.id}:`,
              err,
            );
          });
        }
        continue;
      }
      if (roundNumber < 0 || roundNumber > TOTAL_ROUNDS) continue;

      const currentQuestion = match.questions.find((q) => q.position === roundNumber);
      if (!currentQuestion) continue;

      if (currentQuestion.closedAt === null) {
        if (currentQuestion.deadlineAt > now) {
          const remainingMs = currentQuestion.deadlineAt.getTime() - now.getTime();
          this.timerService.scheduleDeadline(match.id, roundNumber, remainingMs, () => {
            this.closeRound(match.id, roundNumber).catch((err) => {
              console.error(`Error closing round ${roundNumber} during recovered deadline:`, err);
            });
          });
        } else {
          await this.closeRound(match.id, roundNumber).catch((err) => {
            console.error(`Error closing expired round ${roundNumber} during recovery:`, err);
          });
        }
      } else {
        const transitionTime = new Date(currentQuestion.closedAt.getTime() + FEEDBACK_DELAY_MS);
        const remainingMs = transitionTime.getTime() - now.getTime();

        const proceedWithTransition = () => {
          if (roundNumber < TOTAL_ROUNDS) {
            this.startRound(match.id, roundNumber + 1).catch((err) => {
              console.error(`Error starting round ${roundNumber + 1} during recovery:`, err);
            });
          } else {
            this.completeMatch(match.id).catch((err) => {
              console.error(`Error completing match during recovery:`, err);
            });
          }
        };

        if (remainingMs > 0) {
          this.timerService.scheduleTransition(
            match.id,
            roundNumber,
            remainingMs,
            proceedWithTransition,
          );
        } else {
          proceedWithTransition();
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
