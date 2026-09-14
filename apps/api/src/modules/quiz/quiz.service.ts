import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { Difficulty, GameStatus, AnswerStatus, CoinTransactionType } from '../../types/contracts';

const QUESTION_COUNT = 5;
const DEFAULT_TIME_LIMIT_BY_DIFFICULTY: Record<Difficulty, number> = {
  [Difficulty.EASY]: 20,
  [Difficulty.MEDIUM]: 15,
  [Difficulty.HARD]: 10,
  [Difficulty.VERY_HARD]: 5,
};
const COIN_PER_CORRECT_ANSWER = 10;
const COIN_COMPLETION_BONUS = 50;

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async startQuiz(userId: string, dto: StartQuizDto) {
    const where: any = { status: 'PUBLISHED' };
    if (dto.categoryId) {
      where.categories = { some: { categoryId: dto.categoryId } };
    }
    if (dto.difficulty) {
      where.difficulty = dto.difficulty;
    }

    const questions = await this.prisma.question.findMany({
      where,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    if (questions.length === 0) {
      throw new BadRequestException('No questions available for the selected criteria');
    }

    const selected = this.shuffleArray(questions).slice(0, QUESTION_COUNT);

    const quizSession = await this.prisma.quizSession.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        difficulty: dto.difficulty,
        questions: {
          create: selected.map((q, index) => {
            const difficulty = (dto.difficulty ?? q.difficulty) as Difficulty;
            const timeLimit = DEFAULT_TIME_LIMIT_BY_DIFFICULTY[difficulty];
            const startsAt = new Date();
            const deadlineAt = new Date(startsAt.getTime() + timeLimit * 1000);
            return {
              questionId: q.id,
              position: index + 1,
              startsAt,
              deadlineAt,
            };
          }),
        },
      },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: {
            question: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
      },
    });

    return quizSession;
  }

  async submitAnswer(userId: string, quizSessionId: string, dto: SubmitAnswerDto) {
    const session = await this.prisma.quizSession.findFirst({
      where: { id: quizSessionId, userId, status: GameStatus.ACTIVE },
      include: {
        questions: {
          where: { questionId: dto.questionId },
          include: { question: { include: { options: true } } },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    const quizQuestion = session.questions[0];
    if (!quizQuestion) {
      throw new BadRequestException('Question not found in this quiz');
    }

    if (quizQuestion.answeredAt) {
      throw new BadRequestException('Question already answered');
    }

    const isCorrect = quizQuestion.question.options.some(
      (opt) => opt.id === dto.selectedOptionId && opt.isCorrect,
    );

    const now = new Date();
    const isTimedOut = now > quizQuestion.deadlineAt;
    let status = AnswerStatus.PENDING;
    if (isTimedOut) {
      status = AnswerStatus.TIMED_OUT;
    } else if (isCorrect) {
      status = AnswerStatus.CORRECT;
    } else {
      status = AnswerStatus.INCORRECT;
    }

    const updated = await this.prisma.quizSessionQuestion.update({
      where: { id: quizQuestion.id },
      data: {
        selectedOptionId: dto.selectedOptionId,
        answeredAt: now,
        status,
      },
      include: {
        question: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });

    return {
      status: updated.status,
      isCorrect: updated.status === AnswerStatus.CORRECT,
      correctOptionId: quizQuestion.question.options.find((o) => o.isCorrect)?.id,
    };
  }

  async finishQuiz(userId: string, quizSessionId: string) {
    const session = await this.prisma.quizSession.findFirst({
      where: { id: quizSessionId, userId, status: GameStatus.ACTIVE },
      include: {
        questions: { include: { question: { include: { options: true } } } },
      },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    const answeredQuestions = session.questions.filter((q) => q.answeredAt);
    if (answeredQuestions.length < QUESTION_COUNT) {
      throw new BadRequestException('Quiz is not yet complete');
    }

    const correctCount = session.questions.filter((q) => {
      const correctOption = q.question.options.find((o) => o.isCorrect);
      return q.selectedOptionId === correctOption?.id;
    }).length;

    const coinsEarned = correctCount * COIN_PER_CORRECT_ANSWER + COIN_COMPLETION_BONUS;

    await this.prisma.$transaction(async (tx) => {
      await tx.quizSession.update({
        where: { id: quizSessionId },
        data: { status: GameStatus.COMPLETED, completedAt: new Date() },
      });

      await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: coinsEarned } },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: coinsEarned,
          type: CoinTransactionType.GAME_COMPLETION,
          referenceType: 'QuizSession',
          referenceId: quizSessionId,
          note: `Completed quiz with ${correctCount}/${QUESTION_COUNT} correct answers`,
        },
      });

      await this.ensureSeasonEntry(tx, userId, correctCount);
    });

    return {
      correctAnswers: correctCount,
      totalQuestions: QUESTION_COUNT,
      coinsEarned,
    };
  }

  async getQuizHistory(userId: string) {
    return this.prisma.quizSession.findMany({
      where: { userId, status: GameStatus.COMPLETED },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        categoryId: true,
        difficulty: true,
        status: true,
        startedAt: true,
        completedAt: true,
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

  private async ensureSeasonEntry(tx: any, userId: string, correctAnswers: number) {
    const now = new Date();
    const currentSeason = await tx.season.findFirst({
      where: { isActive: true },
    });

    if (!currentSeason) return;

    const existing = await tx.seasonEntry.findFirst({
      where: { seasonId: currentSeason.id, userId },
    });

    if (!existing) {
      await tx.seasonEntry.create({
        data: {
          seasonId: currentSeason.id,
          userId,
          score: correctAnswers * 10,
          correctAnswers,
        },
      });
      return;
    }

    await tx.seasonEntry.update({
      where: { id: existing.id },
      data: {
        score: { increment: correctAnswers * 10 },
        correctAnswers: { increment: correctAnswers },
      },
    });
  }
}
