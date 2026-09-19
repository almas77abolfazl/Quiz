import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuizService, getSeasonPointsForDifficulty, getCoinsForDifficulty } from './quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { Difficulty, GameStatus, AnswerStatus } from '@quiz/contracts';

describe('QuizService Timing & Result Integrity (Phase 5C & 5D)', () => {
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
        findMany: jest.fn().mockResolvedValue([]),
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
      providers: [QuizService, { provide: PrismaService, useValue: prisma }],
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
    for (let i = 1; i < 5; i++) {
      expect(result.questions[i].startsAt).toBeNull();
      expect(result.questions[i].deadlineAt).toBeNull();
    }
  });

  it('3. Next question is NOT activated by submitAnswer', async () => {
    const q1 = mockQuestion('q1');
    const q2 = mockQuestion('q2');
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

    await service.submitAnswer('user-1', 'session-1', {
      questionId: 'q1',
      selectedOptionId: 'opt-q1-correct',
    });

    // Verify quizSessionQuestion.update was called ONLY once (for Q1), NOT for Q2
    expect(prisma.quizSessionQuestion.update).toHaveBeenCalledTimes(1);
    expect(prisma.quizSessionQuestion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sq-q1' } }),
    );
  });

  it('4. advance activates next question with a fresh 30-second deadline', async () => {
    const q1 = mockQuestion('q1');
    const q2 = mockQuestion('q2');
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
          answeredAt: new Date(),
          status: AnswerStatus.CORRECT,
          question: q1,
        },
        {
          id: 'sq-q2',
          quizSessionId: 'session-1',
          questionId: 'q2',
          position: 2,
          startsAt: null, // unactivated
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
        ...session.questions[1],
        ...args.data,
      });
    });

    const res = await service.advanceQuiz('user-1', 'session-1');

    expect(res.isCompleted).toBe(false);
    expect(res.question.questionId).toBe('q2');
    expect(res.question.startsAt).not.toBeNull();
    expect(res.question.deadlineAt).not.toBeNull();

    const startMs = new Date(res.question.startsAt!).getTime();
    const deadlineMs = new Date(res.question.deadlineAt!).getTime();
    expect(deadlineMs - startMs).toBe(30000);
  });

  it('5. Duplicate advance call does NOT reset deadline or skip questions', async () => {
    const q1 = mockQuestion('q1');
    const q2 = mockQuestion('q2');
    const now = new Date();
    const q2Start = new Date(now.getTime() + 5000); // Q2 started 5 seconds ago
    const q2Deadline = new Date(q2Start.getTime() + 30000);

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
          answeredAt: new Date(),
          status: AnswerStatus.CORRECT,
          question: q1,
        },
        {
          id: 'sq-q2',
          quizSessionId: 'session-1',
          questionId: 'q2',
          position: 2,
          startsAt: q2Start, // already active!
          deadlineAt: q2Deadline,
          answeredAt: null,
          status: AnswerStatus.PENDING,
          question: q2,
        },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);

    const res = await service.advanceQuiz('user-1', 'session-1');

    // Should NOT update DB because Q2 is already active
    expect(prisma.quizSessionQuestion.update).not.toHaveBeenCalled();
    expect(res.question.questionId).toBe('q2');
    expect(res.question.startsAt).toBe(q2Start.toISOString());
    expect(res.question.deadlineAt).toBe(q2Deadline.toISOString());
  });

  it('6. An on-time correct answer is CORRECT', async () => {
    const q1 = mockQuestion('q1', Difficulty.EASY);
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
  });

  it('7. A correct option submitted after deadline is TIMED_OUT', async () => {
    const q1 = mockQuestion('q1');
    const pastStart = new Date(Date.now() - 40000);
    const pastDeadline = new Date(Date.now() - 10000);

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
      selectedOptionId: 'opt-q1-correct',
    });

    expect(res.status).toBe(AnswerStatus.TIMED_OUT);
    expect(res.isCorrect).toBe(false);
  });

  it('8. Final coin and season-point totals follow game-rules.md', async () => {
    const qEasy = mockQuestion('q1', Difficulty.EASY);
    const qMedium = mockQuestion('q2', Difficulty.MEDIUM);
    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: GameStatus.ACTIVE,
      startedAt: new Date(),
      questions: [
        { id: 'sq-1', status: AnswerStatus.CORRECT, answeredAt: new Date(), question: qEasy },
        { id: 'sq-2', status: AnswerStatus.CORRECT, answeredAt: new Date(), question: qMedium },
      ],
    };

    prisma.quizSession.findFirst.mockResolvedValue(session);
    prisma.season.findFirst.mockResolvedValue({ id: 'season-1', isActive: true });
    prisma.seasonEntry.findFirst.mockResolvedValue(null);

    const res = await service.finishQuiz('user-1', 'session-1');

    expect(res.correctAnswers).toBe(2);
    expect(res.seasonPointsEarned).toBe(3); // 1 + 2 = 3
    expect(res.coinsEarned).toBe(5); // 1 + 2 + 2 bonus = 5
  });
});
