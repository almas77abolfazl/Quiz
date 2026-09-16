import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuizService, getSeasonPointsForDifficulty, getCoinsForDifficulty } from './quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { Difficulty, GameStatus, AnswerStatus } from '@quiz/contracts';

describe('QuizService Timing & Result Integrity (Phase 5C)', () => {
  let service: QuizService;
  let prisma: any;

  const mockQuestion = (id: string, diff: Difficulty = Difficulty.MEDIUM) => ({
    id,
    text: `Question ${id}`,
    explanation: `Explanation ${id}`,
    difficulty: diff,
    status: 'PUBLISHED',
    options: [
      { id: `opt-${id}-correct`, text: 'Correct Opt', sortOrder: 1, isCorrect: true },
      { id: `opt-${id}-wrong`, text: 'Wrong Opt', sortOrder: 2, isCorrect: false },
    ],
  });

  beforeEach(async () => {
    prisma = {
      question: {
        findMany: jest.fn(),
      },
      quizSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      quizSessionQuestion: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      coinTransaction: {
        create: jest.fn(),
      },
      season: {
        findFirst: jest.fn(),
      },
      seasonEntry: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  it('1. All questions use a 30-second limit and initial Q1 starts at creation', async () => {
    const questions = [
      mockQuestion('q1'),
      mockQuestion('q2'),
      mockQuestion('q3'),
      mockQuestion('q4'),
      mockQuestion('q5'),
    ];
    prisma.question.findMany.mockResolvedValue(questions);

    const now = new Date();
    prisma.quizSession.create.mockImplementation((args: any) => {
      const qCreates = args.data.questions.create;
      return Promise.resolve({
        id: 'session-1',
        userId: 'user-1',
        status: GameStatus.ACTIVE,
        startedAt: now,
        questions: qCreates.map((qc: any) => ({
          id: `sq-${qc.questionId}`,
          quizSessionId: 'session-1',
          questionId: qc.questionId,
          position: qc.position,
          startsAt: qc.startsAt,
          deadlineAt: qc.deadlineAt,
          status: AnswerStatus.PENDING,
          question: questions.find((q) => q.id === qc.questionId),
        })),
      });
    });

    const result = await service.startQuiz('user-1', {});

    expect(result.questions).toHaveLength(5);
    const q1 = result.questions[0];
    expect(q1.startsAt).not.toBeNull();
    expect(q1.deadlineAt).not.toBeNull();

    const startMs = new Date(q1.startsAt!).getTime();
    const deadlineMs = new Date(q1.deadlineAt!).getTime();
    expect(deadlineMs - startMs).toBe(30000); // Exactly 30 seconds
  });

  it('2. Later questions do not expire before activation', async () => {
    const questions = [
      mockQuestion('q1'),
      mockQuestion('q2'),
      mockQuestion('q3'),
      mockQuestion('q4'),
      mockQuestion('q5'),
    ];
    prisma.question.findMany.mockResolvedValue(questions);

    prisma.quizSession.create.mockImplementation((args: any) => {
      const qCreates = args.data.questions.create;
      return Promise.resolve({
        id: 'session-1',
        userId: 'user-1',
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
        questions: qCreates.map((qc: any) => ({
          id: `sq-${qc.questionId}`,
          quizSessionId: 'session-1',
          questionId: qc.questionId,
          position: qc.position,
          startsAt: qc.startsAt,
          deadlineAt: qc.deadlineAt,
          status: AnswerStatus.PENDING,
          question: questions.find((q) => q.id === qc.questionId),
        })),
      });
    });

    const result = await service.startQuiz('user-1', {});
    // Questions 2..5 have null startsAt and deadlineAt upon creation
    for (let i = 1; i < 5; i++) {
      expect(result.questions[i].startsAt).toBeNull();
      expect(result.questions[i].deadlineAt).toBeNull();
    }
  });

  it('3. An on-time correct answer is CORRECT', async () => {
    const q1 = mockQuestion('q1', Difficulty.EASY);
    const q2 = mockQuestion('q2', Difficulty.EASY);
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + 30000);

    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: now,
      questions: [
        {
          id: 'sq-q1',
          quizSessionId: 'session-1',
          questionId: 'q1',
          position: 1,
          startsAt: now,
          deadlineAt,
          answeredAt: null,
          status: AnswerStatus.PENDING,
          question: q1,
        },
        {
          id: 'sq-q2',
          quizSessionId: 'session-1',
          questionId: 'q2',
          position: 2,
          startsAt: null,
          deadlineAt: null,
          answeredAt: null,
          status: AnswerStatus.PENDING,
          question: q2,
        },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);
    prisma.quizSessionQuestion.update.mockImplementation((args: any) => {
      return Promise.resolve({
        ...session.questions[0],
        ...args.data,
      });
    });

    const res = await service.submitAnswer('user-1', 'session-1', {
      questionId: 'q1',
      selectedOptionId: 'opt-q1-correct',
    });

    expect(res.status).toBe(AnswerStatus.CORRECT);
    expect(res.isCorrect).toBe(true);
    expect(res.feedback.isCorrect).toBe(true);
    expect(res.feedback.timedOut).toBe(false);
    expect(res.feedback.earnedSeasonPoints).toBe(1); // EASY difficulty = 1 point
    expect(res.feedback.earnedCoins).toBe(1);
  });

  it('4. A correct option submitted after deadline is TIMED_OUT', async () => {
    const q1 = mockQuestion('q1');
    const pastStart = new Date(Date.now() - 40000);
    const pastDeadline = new Date(Date.now() - 10000); // expired 10 seconds ago

    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: pastStart,
      questions: [
        {
          id: 'sq-q1',
          quizSessionId: 'session-1',
          questionId: 'q1',
          position: 1,
          startsAt: pastStart,
          deadlineAt: pastDeadline,
          answeredAt: null,
          status: AnswerStatus.PENDING,
          question: q1,
        },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);
    prisma.quizSessionQuestion.update.mockImplementation((args: any) => {
      return Promise.resolve({
        ...session.questions[0],
        ...args.data,
      });
    });

    const res = await service.submitAnswer('user-1', 'session-1', {
      questionId: 'q1',
      selectedOptionId: 'opt-q1-correct', // submitted correct option after deadline
    });

    expect(res.status).toBe(AnswerStatus.TIMED_OUT);
    expect(res.isCorrect).toBe(false);
    expect(res.feedback.isCorrect).toBe(false);
    expect(res.feedback.timedOut).toBe(true);
    expect(res.feedback.earnedSeasonPoints).toBe(0);
    expect(res.feedback.earnedCoins).toBe(0);
  });

  it('5. A timed-out correct option is not counted as correct by finishQuiz', async () => {
    const q1 = mockQuestion('q1');
    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: new Date(),
      questions: [
        {
          id: 'sq-q1',
          quizSessionId: 'session-1',
          questionId: 'q1',
          position: 1,
          startsAt: new Date(),
          deadlineAt: new Date(),
          answeredAt: new Date(),
          selectedOptionId: 'opt-q1-correct',
          status: AnswerStatus.TIMED_OUT, // Status is TIMED_OUT despite correct option selected
          question: q1,
        },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);
    prisma.user.update.mockResolvedValue({});
    prisma.quizSession.update.mockResolvedValue({});

    const res = await service.finishQuiz('user-1', 'session-1');

    expect(res.correctAnswers).toBe(0);
    expect(res.timedOutAnswers).toBe(1);
    expect(res.seasonPointsEarned).toBe(0);
  });

  it('6. Timeout without selectedOptionId works', async () => {
    const q1 = mockQuestion('q1');
    const now = new Date();
    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: now,
      questions: [
        {
          id: 'sq-q1',
          quizSessionId: 'session-1',
          questionId: 'q1',
          position: 1,
          startsAt: now,
          deadlineAt: new Date(now.getTime() - 1000), // timed out
          answeredAt: null,
          status: AnswerStatus.PENDING,
          question: q1,
        },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);
    prisma.quizSessionQuestion.update.mockImplementation((args: any) => {
      return Promise.resolve({
        ...session.questions[0],
        ...args.data,
      });
    });

    const res = await service.submitAnswer('user-1', 'session-1', {
      questionId: 'q1',
      // no selectedOptionId
    });

    expect(res.status).toBe(AnswerStatus.TIMED_OUT);
    expect(res.feedback.selectedOptionId).toBeNull();
  });

  it('7. Duplicate submission is rejected', async () => {
    const q1 = mockQuestion('q1');
    const now = new Date();
    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: now,
      questions: [
        {
          id: 'sq-q1',
          quizSessionId: 'session-1',
          questionId: 'q1',
          position: 1,
          startsAt: now,
          deadlineAt: new Date(now.getTime() + 30000),
          answeredAt: new Date(), // Already answered
          status: AnswerStatus.CORRECT,
          question: q1,
        },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);

    await expect(
      service.submitAnswer('user-1', 'session-1', {
        questionId: 'q1',
        selectedOptionId: 'opt-q1-correct',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('8 & 9. Final coin and season-point totals follow game-rules.md and response contains all counts', async () => {
    const qEasy = mockQuestion('q1', Difficulty.EASY);
    const qMedium = mockQuestion('q2', Difficulty.MEDIUM);
    const qHard = mockQuestion('q3', Difficulty.HARD);
    const qVHard = mockQuestion('q4', Difficulty.VERY_HARD);
    const qTime = mockQuestion('q5', Difficulty.EASY);

    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: new Date(),
      questions: [
        { id: 'sq-1', status: AnswerStatus.CORRECT, question: qEasy },   // EASY: 1 pt, 1 coin
        { id: 'sq-2', status: AnswerStatus.CORRECT, question: qMedium }, // MEDIUM: 2 pt, 1 coin
        { id: 'sq-3', status: AnswerStatus.CORRECT, question: qHard },   // HARD: 3 pt, 2 coin
        { id: 'sq-4', status: AnswerStatus.INCORRECT, question: qVHard },// Incorrect: 0 pt, 0 coin
        { id: 'sq-5', status: AnswerStatus.TIMED_OUT, question: qTime }, // Timed out: 0 pt, 0 coin
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);
    prisma.season.findFirst.mockResolvedValue({ id: 'season-1', isActive: true });
    prisma.seasonEntry.findFirst.mockResolvedValue(null);

    const res = await service.finishQuiz('user-1', 'session-1');

    expect(res.correctAnswers).toBe(3);
    expect(res.incorrectAnswers).toBe(1);
    expect(res.timedOutAnswers).toBe(1);
    expect(res.totalQuestions).toBe(5);

    // Season points: 1 (Easy) + 2 (Medium) + 3 (Hard) = 6
    expect(res.seasonPointsEarned).toBe(6);

    // Coins: 1 (Easy) + 1 (Medium) + 2 (Hard) + 2 (Completion Bonus) = 6
    expect(res.coinsEarned).toBe(6);
  });
});

