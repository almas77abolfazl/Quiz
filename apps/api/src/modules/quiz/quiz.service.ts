import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import {
  Difficulty,
  GameStatus,
  AnswerStatus,
  CoinTransactionType,
  AnswerFeedbackDto,
  StartQuizResponseDto,
  SubmitAnswerResponseDto,
  AdvanceQuizResponseDto,
  FinishQuizResponseDto,
  QuizSessionQuestionDto,
} from '@quiz/contracts';
import { mapToPlayerQuestionDto } from '../question/question.mapper';

const QUESTION_COUNT = 5;
const QUESTION_TIME_LIMIT_SECONDS = 30;
const GAME_COMPLETION_BONUS_COINS = 2;

export function getSeasonPointsForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case Difficulty.EASY:
      return 1;
    case Difficulty.MEDIUM:
      return 2;
    case Difficulty.HARD:
      return 3;
    case Difficulty.VERY_HARD:
      return 5;
    default:
      return 1;
  }
}

export function getCoinsForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case Difficulty.EASY:
      return 1;
    case Difficulty.MEDIUM:
      return 1;
    case Difficulty.HARD:
      return 2;
    case Difficulty.VERY_HARD:
      return 3;
    default:
      return 1;
  }
}

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async startQuiz(userId: string, dto: StartQuizDto): Promise<StartQuizResponseDto> {
    const where: any = { status: 'PUBLISHED' };
    if (dto.categoryId) {
      where.categories = { some: { categoryId: dto.categoryId } };
    }
    if (dto.difficulty) {
      where.difficulty = dto.difficulty;
    }

    const eligibleQuestions = await this.prisma.question.findMany({
      where,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    const eligibleQuestionCount = eligibleQuestions.length;
    if (eligibleQuestionCount < QUESTION_COUNT) {
      throw new BadRequestException(
        'Fewer than 5 published questions are available for the selected criteria',
      );
    }

    const userSeenSessionQuestions = await this.prisma.quizSessionQuestion.findMany({
      where: {
        quizSession: {
          userId,
        },
      },
      select: {
        questionId: true,
      },
    });

    const seenQuestionIds = new Set(userSeenSessionQuestions.map((sq) => sq.questionId));

    const unseenQuestions = eligibleQuestions.filter((q) => !seenQuestionIds.has(q.id));
    const seenQuestions = eligibleQuestions.filter((q) => seenQuestionIds.has(q.id));

    const unseenCount = unseenQuestions.length;
    let selected: typeof eligibleQuestions = [];
    let containsRepeats = false;
    let unseenQuestionsRemaining = 0;

    if (unseenCount >= QUESTION_COUNT) {
      const shuffledUnseen = this.shuffleArray(unseenQuestions);
      selected = shuffledUnseen.slice(0, QUESTION_COUNT);
      containsRepeats = false;
      unseenQuestionsRemaining = unseenCount - QUESTION_COUNT;
    } else if (unseenCount >= 1) {
      const shuffledUnseen = this.shuffleArray(unseenQuestions);
      const shuffledSeen = this.shuffleArray(seenQuestions);
      const neededFromSeen = QUESTION_COUNT - unseenCount;
      selected = [...shuffledUnseen, ...shuffledSeen.slice(0, neededFromSeen)];
      containsRepeats = true;
      unseenQuestionsRemaining = 0;
    } else {
      const shuffledEligible = this.shuffleArray(eligibleQuestions);
      selected = shuffledEligible.slice(0, QUESTION_COUNT);
      containsRepeats = true;
      unseenQuestionsRemaining = 0;
    }

    const now = new Date();
    const quizSession = await this.prisma.quizSession.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        difficulty: dto.difficulty,
        startedAt: now,
        questions: {
          create: selected.map((q, index) => {
            const isFirst = index === 0;
            const startsAt = isFirst ? now : null;
            const deadlineAt = isFirst
              ? new Date(now.getTime() + QUESTION_TIME_LIMIT_SECONDS * 1000)
              : null;
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

    return {
      id: quizSession.id,
      userId: quizSession.userId,
      categoryId: quizSession.categoryId,
      difficulty: quizSession.difficulty as Difficulty | null,
      status: quizSession.status as GameStatus,
      startedAt:
        quizSession.startedAt instanceof Date
          ? quizSession.startedAt.toISOString()
          : quizSession.startedAt,
      questions: quizSession.questions.map((sq) => this.mapToQuizSessionQuestionDto(sq)),
      containsRepeats,
      unseenQuestionsRemaining,
      eligibleQuestionCount,
    };
  }

  async submitAnswer(
    userId: string,
    quizSessionId: string,
    dto: SubmitAnswerDto,
  ): Promise<SubmitAnswerResponseDto> {
    const session = await this.prisma.quizSession.findFirst({
      where: { id: quizSessionId, userId, status: GameStatus.ACTIVE },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { question: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    const quizQuestion = session.questions.find((q) => q.questionId === dto.questionId);
    if (!quizQuestion) {
      throw new BadRequestException('Question not found in this quiz');
    }

    if (quizQuestion.answeredAt) {
      throw new BadRequestException('Question already answered');
    }

    const now = new Date();
    let startsAt = quizQuestion.startsAt;
    let deadlineAt = quizQuestion.deadlineAt;

    if (!startsAt || !deadlineAt) {
      const prevQuestion = session.questions.find((q) => q.position === quizQuestion.position - 1);
      const prevStartsAt = prevQuestion?.startsAt ?? session.startedAt;
      const prevDeadlineAt =
        prevQuestion?.deadlineAt ??
        new Date(prevStartsAt.getTime() + QUESTION_TIME_LIMIT_SECONDS * 1000);
      startsAt = prevQuestion?.answeredAt ?? prevDeadlineAt;
      deadlineAt = new Date(startsAt.getTime() + QUESTION_TIME_LIMIT_SECONDS * 1000);
    }

    const isTimedOut = now > deadlineAt;
    const correctOption = quizQuestion.question.options.find((opt) => opt.isCorrect);
    const isCorrectOption = dto.selectedOptionId
      ? correctOption?.id === dto.selectedOptionId
      : false;

    let status = AnswerStatus.PENDING;
    if (isTimedOut) {
      status = AnswerStatus.TIMED_OUT;
    } else if (isCorrectOption) {
      status = AnswerStatus.CORRECT;
    } else {
      status = AnswerStatus.INCORRECT;
    }

    const updated = await this.prisma.quizSessionQuestion.update({
      where: { id: quizQuestion.id },
      data: {
        selectedOptionId: dto.selectedOptionId ?? null,
        answeredAt: now,
        status,
        startsAt,
        deadlineAt,
      },
      include: {
        question: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });

    const correctOptionId = correctOption?.id ?? '';
    const isAnswerCorrect = updated.status === AnswerStatus.CORRECT;
    const isAnswerTimedOut = updated.status === AnswerStatus.TIMED_OUT;

    const diff = quizQuestion.question.difficulty as Difficulty;
    const earnedSeasonPoints = isAnswerCorrect ? getSeasonPointsForDifficulty(diff) : 0;
    const earnedCoins = isAnswerCorrect ? getCoinsForDifficulty(diff) : 0;

    const feedback: AnswerFeedbackDto = {
      questionId: quizQuestion.questionId,
      selectedOptionId: dto.selectedOptionId ?? null,
      correctOptionId,
      isCorrect: isAnswerCorrect,
      timedOut: isAnswerTimedOut,
      explanation: quizQuestion.question.explanation ?? null,
      earnedSeasonPoints,
      earnedCoins,
    };

    return {
      status: updated.status as AnswerStatus,
      isCorrect: isAnswerCorrect,
      correctOptionId,
      feedback,
    };
  }

  async advanceQuiz(userId: string, quizSessionId: string): Promise<AdvanceQuizResponseDto> {
    const session = await this.prisma.quizSession.findFirst({
      where: { id: quizSessionId, userId, status: GameStatus.ACTIVE },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { question: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    const currentUnanswered = session.questions.find((q) => q.answeredAt === null);
    if (!currentUnanswered) {
      const lastQ = session.questions[session.questions.length - 1];
      return {
        question: this.mapToQuizSessionQuestionDto(lastQ),
        isCompleted: true,
      };
    }

    if (currentUnanswered.startsAt !== null) {
      return {
        question: this.mapToQuizSessionQuestionDto(currentUnanswered),
        isCompleted: false,
      };
    }

    const prevQuestion = session.questions.find(
      (q) => q.position === currentUnanswered.position - 1,
    );
    if (prevQuestion && prevQuestion.answeredAt === null) {
      throw new BadRequestException('Previous question is not yet answered');
    }

    const now = new Date();
    const deadlineAt = new Date(now.getTime() + QUESTION_TIME_LIMIT_SECONDS * 1000);
    const updated = await this.prisma.quizSessionQuestion.update({
      where: { id: currentUnanswered.id },
      data: {
        startsAt: now,
        deadlineAt,
      },
      include: {
        question: { include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    });

    return {
      question: this.mapToQuizSessionQuestionDto(updated),
      isCompleted: false,
    };
  }

  async finishQuiz(userId: string, quizSessionId: string): Promise<FinishQuizResponseDto> {
    const session = await this.prisma.quizSession.findFirst({
      where: { id: quizSessionId, userId, status: GameStatus.ACTIVE },
      include: {
        questions: { include: { question: { include: { options: true } } } },
      },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    const unanswered = session.questions.filter((q) => q.answeredAt === null);
    if (unanswered.length > 0) {
      throw new BadRequestException('Quiz is not yet complete');
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let timedOutCount = 0;
    let seasonPointsEarned = 0;
    let coinsFromAnswers = 0;

    for (const q of session.questions) {
      if (q.status === AnswerStatus.CORRECT) {
        correctCount++;
        const diff = q.question.difficulty as Difficulty;
        const points = getSeasonPointsForDifficulty(diff);
        const coins = getCoinsForDifficulty(diff);
        seasonPointsEarned += points;
        coinsFromAnswers += coins;
      } else if (q.status === AnswerStatus.INCORRECT) {
        incorrectCount++;
      } else {
        timedOutCount++;
      }
    }

    const totalQuestions = session.questions.length;
    const coinsEarned = coinsFromAnswers + GAME_COMPLETION_BONUS_COINS;

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
          note: `Completed quiz with ${correctCount}/${totalQuestions} correct answers`,
        },
      });

      await this.ensureSeasonEntry(tx, userId, correctCount, seasonPointsEarned);
    });

    return {
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      timedOutAnswers: timedOutCount,
      totalQuestions,
      coinsEarned,
      seasonPointsEarned,
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

  private mapToQuizSessionQuestionDto(sq: any): QuizSessionQuestionDto {
    return {
      id: sq.id,
      questionId: sq.questionId,
      position: sq.position,
      startsAt: sq.startsAt
        ? sq.startsAt instanceof Date
          ? sq.startsAt.toISOString()
          : sq.startsAt
        : null,
      deadlineAt: sq.deadlineAt
        ? sq.deadlineAt instanceof Date
          ? sq.deadlineAt.toISOString()
          : sq.deadlineAt
        : null,
      question: mapToPlayerQuestionDto(sq.question),
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async ensureSeasonEntry(
    tx: any,
    userId: string,
    correctAnswers: number,
    seasonPointsEarned: number,
  ) {
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
          score: seasonPointsEarned,
          correctAnswers,
          reachedScoreAt: new Date(),
        },
      });
      return;
    }

    await tx.seasonEntry.update({
      where: { id: existing.id },
      data: {
        score: { increment: seasonPointsEarned },
        correctAnswers: { increment: correctAnswers },
        reachedScoreAt: new Date(),
      },
    });
  }
}
