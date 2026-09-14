import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus, AnswerStatus, Difficulty } from '@quiz/contracts';

const MATCH_TIMEOUT_MS = 15 * 1000;
const TOTAL_ROUNDS = 5;

@Injectable()
export class MatchService {
  constructor(private readonly prisma: PrismaService) {}

  async joinMatchmaking(userId: string, categoryId?: string, difficulty?: Difficulty) {
    const existing = await this.prisma.match.findFirst({
      where: {
        status: MatchStatus.WAITING,
        participants: { some: { userId } },
      },
      include: { participants: true },
    });

    if (existing) {
      return existing;
    }

    const waitingMatch = await this.prisma.match.findFirst({
      where: { status: MatchStatus.WAITING },
      include: { participants: true },
    });

    if (waitingMatch && waitingMatch.participants.length === 1) {
      await this.prisma.matchParticipant.create({
        data: {
          matchId: waitingMatch.id,
          userId,
        },
      });

      await this.prisma.match.update({
        where: { id: waitingMatch.id },
        data: { status: MatchStatus.ACTIVE, startedAt: new Date() },
      });

      return this.prisma.match.findFirst({
        where: { id: waitingMatch.id },
        include: { participants: true, questions: true },
      });
    }

    return this.prisma.match.create({
      data: {
        categoryId,
        difficulty,
        participants: { create: { userId } },
        questions: { create: [] },
      },
      include: { participants: true, questions: true },
    });
  }

  async startMatch(matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId },
      include: { participants: { include: { user: true } } },
    });

    if (!match || match.status !== MatchStatus.ACTIVE) {
      throw new NotFoundException('Match not found');
    }

    const where: any = { status: 'PUBLISHED' };
    if (match.categoryId) {
      where.categories = { some: { categoryId: match.categoryId } };
    }
    if (match.difficulty) {
      where.difficulty = match.difficulty;
    }

    const questions = await this.prisma.question.findMany({
      where,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    if (questions.length < TOTAL_ROUNDS) {
      throw new BadRequestException('Not enough questions available');
    }

    const selected = this.shuffleArray(questions).slice(0, TOTAL_ROUNDS);

    await this.prisma.matchQuestion.createMany({
      data: selected.map((q, index) => ({
        matchId,
        questionId: q.id,
        position: index + 1,
        startsAt: new Date(),
        deadlineAt: new Date(Date.now() + 15 * 1000),
      })),
    });

    return this.prisma.match.findFirst({
      where: { id: matchId },
      include: {
        participants: { include: { user: true } },
        questions: { include: { question: { include: { options: true } } } },
      },
    });
  }

  async submitAnswer(matchId: string, userId: string, matchQuestionId: string, selectedOptionId?: string) {
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

    const totalAnswers = match.questions.reduce(
      (acc, q) => acc + q.answers.length,
      0,
    );

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

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
