import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { Difficulty, GameStatus } from '@quiz/contracts';

describe('QuizService Question Selection & Repeat Prevention (Phase 5E-1)', () => {
  let service: QuizService;
  let prisma: any;

  const mockQuestion = (id: string, categoryId = 'cat1', diff: Difficulty = Difficulty.MEDIUM) => ({
    id,
    text: `Question ${id}`,
    explanation: `Explanation ${id}`,
    difficulty: diff,
    status: 'PUBLISHED',
    categories: [{ categoryId }],
    options: [
      { id: `opt-${id}-correct`, text: 'Correct Opt', sortOrder: 1, isCorrect: true },
      { id: `opt-${id}-wrong`, text: 'Wrong Opt', sortOrder: 2, isCorrect: false },
    ],
  });

  const setupMockSessionCreate = () => {
    prisma.quizSession.create.mockImplementation((args: any) => {
      const qCreates = args.data.questions.create;
      return Promise.resolve({
        id: 'session-' + Math.random().toString(36).substring(7),
        userId: args.data.userId,
        categoryId: args.data.categoryId ?? null,
        difficulty: args.data.difficulty ?? null,
        status: GameStatus.ACTIVE,
        startedAt: args.data.startedAt,
        questions: qCreates.map((qc: any) => ({
          id: `sq-${qc.questionId}`,
          quizSessionId: 'session-id',
          questionId: qc.questionId,
          position: qc.position,
          startsAt: qc.startsAt,
          deadlineAt: qc.deadlineAt,
          question: mockPool.find((q) => q.id === qc.questionId),
        })),
      });
    });
  };

  let mockPool: ReturnType<typeof mockQuestion>[];

  beforeEach(async () => {
    mockPool = Array.from({ length: 12 }, (_, i) => mockQuestion(`q${i + 1}`));

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
        findMany: jest.fn(),
        update: jest.fn(),
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

    setupMockSessionCreate();

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  it('1. First session uses only unseen questions', async () => {
    prisma.question.findMany.mockResolvedValue(mockPool);
    prisma.quizSessionQuestion.findMany.mockResolvedValue([]); // No seen questions

    const res = await service.startQuiz('user-1', {});

    expect(res.questions).toHaveLength(5);
    expect(res.containsRepeats).toBe(false);
    expect(res.eligibleQuestionCount).toBe(12);
    expect(res.unseenQuestionsRemaining).toBe(7);

    const questionIds = res.questions.map((q) => q.questionId);
    const uniqueIds = new Set(questionIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('2. Consecutive sessions avoid previous questions while enough unseen questions exist', async () => {
    prisma.question.findMany.mockResolvedValue(mockPool);

    // User-1 has seen q1, q2, q3, q4, q5
    const seenRecords = ['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => ({ questionId: id }));
    prisma.quizSessionQuestion.findMany.mockResolvedValue(seenRecords);

    const res = await service.startQuiz('user-1', {});

    expect(res.questions).toHaveLength(5);
    expect(res.containsRepeats).toBe(false);
    expect(res.eligibleQuestionCount).toBe(12);
    expect(res.unseenQuestionsRemaining).toBe(2); // 12 total - 5 seen - 5 selected = 2 remaining

    const selectedIds = res.questions.map((q) => q.questionId);
    // None of the selected IDs should be in seenRecords
    for (const id of selectedIds) {
      expect(['q1', 'q2', 'q3', 'q4', 'q5']).not.toContain(id);
    }
  });

  it('3. 1–4 remaining unseen questions are all selected before older questions fill the session', async () => {
    // Pool has 12 questions. User has seen 10 questions (q1 to q10).
    // Remaining unseen: q11, q12 (2 unseen questions).
    prisma.question.findMany.mockResolvedValue(mockPool);
    const seenRecords = Array.from({ length: 10 }, (_, i) => ({ questionId: `q${i + 1}` }));
    prisma.quizSessionQuestion.findMany.mockResolvedValue(seenRecords);

    const res = await service.startQuiz('user-1', {});

    expect(res.questions).toHaveLength(5);
    expect(res.containsRepeats).toBe(true);
    expect(res.unseenQuestionsRemaining).toBe(0);

    const selectedIds = res.questions.map((q) => q.questionId);
    // Must contain both unseen questions q11 and q12
    expect(selectedIds).toContain('q11');
    expect(selectedIds).toContain('q12');

    // Exactly 5 unique IDs
    const uniqueIds = new Set(selectedIds);
    expect(uniqueIds.size).toBe(5);

    // The remaining 3 slots filled from seen set (q1-q10)
    const filledFromSeen = selectedIds.filter((id) => id !== 'q11' && id !== 'q12');
    expect(filledFromSeen).toHaveLength(3);
  });

  it('4. An exhausted pool allows repeats', async () => {
    // User has seen all 12 questions (q1-q12)
    prisma.question.findMany.mockResolvedValue(mockPool);
    const seenRecords = Array.from({ length: 12 }, (_, i) => ({ questionId: `q${i + 1}` }));
    prisma.quizSessionQuestion.findMany.mockResolvedValue(seenRecords);

    const res = await service.startQuiz('user-1', {});

    expect(res.questions).toHaveLength(5);
    expect(res.containsRepeats).toBe(true);
    expect(res.unseenQuestionsRemaining).toBe(0);

    const selectedIds = res.questions.map((q) => q.questionId);
    const uniqueIds = new Set(selectedIds);
    expect(uniqueIds.size).toBe(5);
  });

  it('5. No session contains duplicate question IDs', async () => {
    prisma.question.findMany.mockResolvedValue(mockPool);
    // Test under partial seen, empty seen, and exhausted seen
    for (const seenCount of [0, 3, 5, 10, 12]) {
      const seenRecords = Array.from({ length: seenCount }, (_, i) => ({
        questionId: `q${i + 1}`,
      }));
      prisma.quizSessionQuestion.findMany.mockResolvedValue(seenRecords);

      const res = await service.startQuiz('user-1', {});
      const selectedIds = res.questions.map((q) => q.questionId);
      const uniqueIds = new Set(selectedIds);
      expect(uniqueIds.size).toBe(5);
    }
  });

  it('6. Category and difficulty filters remain respected', async () => {
    const easyCat1Pool = [
      mockQuestion('q1', 'cat1', Difficulty.EASY),
      mockQuestion('q2', 'cat1', Difficulty.EASY),
      mockQuestion('q3', 'cat1', Difficulty.EASY),
      mockQuestion('q4', 'cat1', Difficulty.EASY),
      mockQuestion('q5', 'cat1', Difficulty.EASY),
    ];

    prisma.question.findMany.mockImplementation((args: any) => {
      expect(args.where.status).toBe('PUBLISHED');
      expect(args.where.categories).toEqual({ some: { categoryId: 'cat1' } });
      expect(args.where.difficulty).toBe(Difficulty.EASY);
      return Promise.resolve(easyCat1Pool);
    });
    prisma.quizSessionQuestion.findMany.mockResolvedValue([]);

    const res = await service.startQuiz('user-1', {
      categoryId: 'cat1',
      difficulty: Difficulty.EASY,
    });

    expect(res.questions).toHaveLength(5);
    expect(res.categoryId).toBe('cat1');
    expect(res.difficulty).toBe(Difficulty.EASY);
  });

  it('7. Fewer than 5 eligible questions creates no session', async () => {
    const smallPool = mockPool.slice(0, 4); // Only 4 questions
    prisma.question.findMany.mockResolvedValue(smallPool);

    await expect(service.startQuiz('user-1', {})).rejects.toThrow(BadRequestException);
    expect(prisma.quizSession.create).not.toHaveBeenCalled();
  });

  it('8. Another user has an independent seen-question history', async () => {
    prisma.question.findMany.mockResolvedValue(mockPool);

    // Mock findMany based on userId in quizSession where clause
    prisma.quizSessionQuestion.findMany.mockImplementation((args: any) => {
      if (args.where?.quizSession?.userId === 'user-1') {
        return Promise.resolve(Array.from({ length: 12 }, (_, i) => ({ questionId: `q${i + 1}` })));
      }
      // user-2 has seen nothing
      return Promise.resolve([]);
    });

    const resUser1 = await service.startQuiz('user-1', {});
    expect(resUser1.containsRepeats).toBe(true);

    const resUser2 = await service.startQuiz('user-2', {});
    expect(resUser2.containsRepeats).toBe(false);
    expect(resUser2.unseenQuestionsRemaining).toBe(7);
  });

  it('9. Active/abandoned sessions count as seen', async () => {
    prisma.question.findMany.mockResolvedValue(mockPool);

    // Questions delivered to user-1 in an active or abandoned session are in QuizSessionQuestion table
    // Query checks quizSessionQuestion where quizSession.userId = userId (regardless of session status)
    prisma.quizSessionQuestion.findMany.mockImplementation((args: any) => {
      expect(args.where.quizSession.userId).toBe('user-1');
      return Promise.resolve([
        { questionId: 'q1' },
        { questionId: 'q2' },
        { questionId: 'q3' },
        { questionId: 'q4' },
        { questionId: 'q5' },
      ]);
    });

    const res = await service.startQuiz('user-1', {});
    const selectedIds = res.questions.map((q) => q.questionId);

    // q1..q5 should be excluded since 7 unseen questions remain (q6..q12)
    for (const id of ['q1', 'q2', 'q3', 'q4', 'q5']) {
      expect(selectedIds).not.toContain(id);
    }
  });
});
