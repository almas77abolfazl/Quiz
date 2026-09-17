import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MatchStatus,
  AnswerStatus,
  Difficulty,
  QuestionStatus,
  MatchSocketErrorCode,
} from '@quiz/contracts';
import { MatchmakingQueue } from './matchmaking-queue';

const TOTAL_ROUNDS = 5;

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

@Injectable()
export class MatchService {
  private readonly mutex = new AsyncMutex();

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchmakingQueue: MatchmakingQueue,
  ) {}

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
      // Re-verify queued state inside mutex lock
      if (await this.matchmakingQueue.isQueued(userId)) {
        return { status: 'queued', categoryId, difficulty };
      }

      // Look for a matching opponent candidate in the queue
      const candidate = await this.matchmakingQueue.findAndRemoveCandidate(
        userId,
        categoryId,
        difficulty,
      );

      if (candidate) {
        try {
          // Attempt to create match & questions in one atomic DB transaction
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
          // Transaction failed (e.g. insufficient questions or DB error):
          // Restore candidate player to the queue to maintain consistent state
          await this.matchmakingQueue.enqueue(candidate);
          throw err;
        }
      }

      // No opponent found: add user to the queue
      await this.matchmakingQueue.enqueue({
        userId,
        categoryId,
        difficulty,
        joinedAt: new Date(),
      });

      return { status: 'queued', categoryId, difficulty };
    });
  }

  async leaveMatchmaking(userId: string): Promise<{ status: 'left' }> {
    await this.matchmakingQueue.dequeue(userId);
    return { status: 'left' };
  }

  async isQueued(userId: string): Promise<boolean> {
    return this.matchmakingQueue.isQueued(userId);
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
    const deadline = new Date(now.getTime() + 15 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          categoryId,
          difficulty,
          status: MatchStatus.ACTIVE,
          startedAt: now,
          participants: {
            create: [{ userId: playerAId }, { userId: playerBId }],
          },
          questions: {
            create: selectedQuestions.map((q, index) => ({
              questionId: q.id,
              position: index + 1,
              startsAt: now,
              deadlineAt: deadline,
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

  // Legacy / Phase 7A helper methods kept for backward compatibility with existing tests
  async joinMatchmaking(userId: string, categoryId?: string, difficulty?: Difficulty) {
    const res = await this.processJoinMatchmaking(userId, categoryId, difficulty);
    if (res.status === 'already_matched') return res.match;
    if (res.status === 'matched') return res.match;
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

  async submitAnswer(
    matchId: string,
    userId: string,
    matchQuestionId: string,
    selectedOptionId?: string,
  ) {
    const participant = await this.prisma.matchParticipant.findFirst({
      where: { matchId, userId },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const matchQuestion = await this.prisma.matchQuestion.findFirst({
      where: { id: matchQuestionId, matchId },
      include: { question: { include: { options: true } } },
    });
    if (!matchQuestion) throw new NotFoundException('Match question not found');

    const existingAnswer = await this.prisma.matchAnswer.findFirst({
      where: { matchQuestionId, participantId: participant.id },
    });
    if (existingAnswer) throw new BadRequestException('Already answered');

    const isCorrect = matchQuestion.question.options.some(
      (opt) => opt.id === selectedOptionId && opt.isCorrect,
    );

    const now = new Date();
    let status = AnswerStatus.PENDING;
    if (now > matchQuestion.deadlineAt) {
      status = AnswerStatus.TIMED_OUT;
    } else if (isCorrect) {
      status = AnswerStatus.CORRECT;
    } else if (selectedOptionId) {
      status = AnswerStatus.INCORRECT;
    }

    await this.prisma.matchAnswer.create({
      data: {
        matchQuestionId,
        participantId: participant.id,
        selectedOptionId,
        answeredAt: now,
        status,
      },
    });

    if (status === AnswerStatus.CORRECT) {
      await this.prisma.matchParticipant.update({
        where: { id: participant.id },
        data: { score: { increment: 10 } },
      });
    }

    return {
      status,
      isCorrect: status === AnswerStatus.CORRECT,
      participantId: participant.id,
    };
  }

  async completeMatch(matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId },
      include: {
        participants: { include: { answers: true } },
        questions: { include: { answers: true } },
      },
    });

    if (!match) throw new NotFoundException('Match not found');

    const totalAnswers = match.questions.reduce((acc, q) => acc + q.answers.length, 0);

    if (totalAnswers < match.participants.length * TOTAL_ROUNDS) {
      return match;
    }

    const participants = match.participants.map((p) => ({
      ...p,
      correctCount: p.answers.filter((a) => a.status === AnswerStatus.CORRECT).length,
    }));

    const sorted = participants.sort((a, b) => b.correctCount - a.correctCount);
    const winner = sorted[0];
    const loser = sorted[1];

    await this.prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      if (winner && loser && winner.correctCount !== loser.correctCount) {
        await tx.matchParticipant.update({
          where: { id: winner.id },
          data: { isWinner: true, coinReward: 100 },
        });

        await tx.matchParticipant.update({
          where: { id: loser.id },
          data: { isWinner: false, coinReward: 25 },
        });

        await tx.user.update({
          where: { id: winner.userId },
          data: { coins: { increment: 100 } },
        });

        await tx.user.update({
          where: { id: loser.userId },
          data: { coins: { increment: 25 } },
        });
      }
    });

    return this.prisma.match.findFirst({
      where: { id: matchId },
      include: {
        participants: { include: { user: true } },
        questions: { include: { question: { include: { options: true } } } },
      },
    });
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

  async isParticipant(matchId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.matchParticipant.count({
      where: { matchId, userId },
    });
    return count > 0;
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
