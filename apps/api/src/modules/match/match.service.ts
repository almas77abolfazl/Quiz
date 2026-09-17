import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchTimerService } from './match-timer.service';
import { MatchPresenceService } from './match-presence.service';
import {
  MatchStatus,
  AnswerStatus,
  Difficulty,
  QuestionStatus,
  MatchSocketErrorCode,
  MatchRoundStartS2CPayload,
  MatchRoundResultS2CPayload,
  MatchEndS2CPayload,
  MatchReconnectS2CPayload,
} from '@quiz/contracts';
import { MatchmakingQueue } from './matchmaking-queue';

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
      // Transition match status to ACTIVE exactly once
      const updateResult = await this.prisma.match.updateMany({
        where: { id: matchId, status: MatchStatus.WAITING },
        data: {
          status: MatchStatus.ACTIVE,
          currentRound: 1,
          startedAt: new Date(),
        },
      });

      if (updateResult.count === 1) {
        await this.startRound(matchId, 1);
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

  async completeMatch(matchId: string): Promise<boolean> {
    const now = new Date();

    // Atomic update to transition status to COMPLETED exactly once
    const updateResult = await this.prisma.match.updateMany({
      where: { id: matchId, status: MatchStatus.ACTIVE },
      data: {
        status: MatchStatus.COMPLETED,
        completedAt: now,
      },
    });

    if (updateResult.count === 0) {
      return false;
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match || match.participants.length < 2) return false;

    const pA = match.participants[0];
    const pB = match.participants[1];

    let winnerId: string | null = null;
    let isDraw = false;

    if (pA.score > pB.score) {
      winnerId = pA.userId;
      await this.prisma.matchParticipant.update({
        where: { id: pA.id },
        data: { isWinner: true },
      });
    } else if (pB.score > pA.score) {
      winnerId = pB.userId;
      await this.prisma.matchParticipant.update({
        where: { id: pB.id },
        data: { isWinner: true },
      });
    } else {
      isDraw = true;
    }

    const endForA: MatchEndS2CPayload = {
      matchId,
      winnerId,
      yourScore: pA.score,
      opponentScore: pB.score,
      isDraw,
    };

    const endForB: MatchEndS2CPayload = {
      matchId,
      winnerId,
      yourScore: pB.score,
      opponentScore: pA.score,
      isDraw,
    };

    if (this.eventListener) {
      this.eventListener.onMatchEnd([
        { userId: pA.userId, payload: endForA },
        { userId: pB.userId, payload: endForB },
      ]);
    }

    this.timerService.cancelAllTimersForMatch(matchId);
    return true;
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

  async getReconnectSnapshot(
    matchId: string,
    userId: string,
  ): Promise<MatchReconnectS2CPayload> {
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

    const basePayload = {
      matchId: match.id,
      matchStatus: match.status as unknown as MatchStatus,
      currentRound: match.currentRound,
      totalRounds: TOTAL_ROUNDS,
      yourScore: me.score,
      opponentScore: opponentPart ? opponentPart.score : 0,
      serverNow: now.toISOString(),
      opponent,
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

      const finalResult: MatchEndS2CPayload = {
        matchId: match.id,
        winnerId,
        yourScore: me.score,
        opponentScore: opponentPart ? opponentPart.score : 0,
        isDraw,
      };

      return {
        ...basePayload,
        phase: 'COMPLETED',
        finalResult,
      };
    }

    // Active match
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

    const now = new Date();

    for (const match of activeMatches) {
      const roundNumber = match.currentRound;
      if (roundNumber <= 0 || roundNumber > TOTAL_ROUNDS) continue;

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
          this.timerService.scheduleTransition(match.id, roundNumber, remainingMs, proceedWithTransition);
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
