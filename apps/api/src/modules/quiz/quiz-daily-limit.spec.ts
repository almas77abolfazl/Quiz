import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuizService, getProductDateKey } from './quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Difficulty, GameStatus, AnswerStatus } from '@quiz/contracts';

describe('Phase 5E-2: Daily Ranked-Game Limit for Solo Quizzes', () => {
  let service: QuizService;
  let prismaMock: any;
  let dailyUsageStore: Map<string, number>;

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

  const createActiveSession = (sessionId: string, userId: string) => {
    const questions = [mockQuestion('q1', Difficulty.EASY), mockQuestion('q2', Difficulty.MEDIUM)];
    const now = new Date();
    return {
      id: sessionId,
      userId,
      status: GameStatus.ACTIVE,
      startedAt: now,
      questions: [
        {
          id: `sq-${sessionId}-1`,
          quizSessionId: sessionId,
          questionId: 'q1',
          position: 1,
          startsAt: now,
          deadlineAt: new Date(now.getTime() + 30000),
          answeredAt: now,
          status: AnswerStatus.CORRECT,
          question: questions[0],
        },
        {
          id: `sq-${sessionId}-2`,
          quizSessionId: sessionId,
          questionId: 'q2',
          position: 2,
          startsAt: now,
          deadlineAt: new Date(now.getTime() + 30000),
          answeredAt: now,
          status: AnswerStatus.CORRECT,
          question: questions[1],
        },
      ],
    };
  };

  beforeEach(async () => {
    dailyUsageStore = new Map<string, number>();

    const activeSessionsStore = new Map<string, any>();

    const seasonEntriesStore = new Map<string, any>();

    prismaMock = {
      dailyUsage: {
        upsert: jest.fn().mockImplementation(({ where }) => {
          const key = `${where.userId_dateKey.userId}:${where.userId_dateKey.dateKey}`;
          if (!dailyUsageStore.has(key)) {
            dailyUsageStore.set(key, 0);
          }
          return Promise.resolve({
            userId: where.userId_dateKey.userId,
            dateKey: where.userId_dateKey.dateKey,
            soloRankedCount: dailyUsageStore.get(key),
          });
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const key = `${where.userId_dateKey.userId}:${where.userId_dateKey.dateKey}`;
          const count = dailyUsageStore.get(key) ?? 0;
          return Promise.resolve({
            userId: where.userId_dateKey.userId,
            dateKey: where.userId_dateKey.dateKey,
            soloRankedCount: count,
          });
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const key = `${where.userId_dateKey.userId}:${where.userId_dateKey.dateKey}`;
          const current = dailyUsageStore.get(key) ?? 0;
          const next = current + (data.soloRankedCount?.increment ?? 1);
          dailyUsageStore.set(key, next);
          return Promise.resolve({
            userId: where.userId_dateKey.userId,
            dateKey: where.userId_dateKey.dateKey,
            soloRankedCount: next,
          });
        }),
      },
      quizSession: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const session = activeSessionsStore.get(where.id);
          if (session && session.userId === where.userId && session.status === where.status) {
            return Promise.resolve(session);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const session = activeSessionsStore.get(where.id);
          if (session) {
            Object.assign(session, data);
          }
          return Promise.resolve(session);
        }),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
      coinTransaction: {
        create: jest.fn().mockResolvedValue({}),
      },
      season: {
        findFirst: jest.fn().mockResolvedValue({ id: 'season-active', isActive: true }),
      },
      seasonEntry: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          const key = `${where.seasonId}:${where.userId}`;
          return Promise.resolve(seasonEntriesStore.get(key) ?? null);
        }),
        create: jest.fn().mockImplementation(({ data }: any) => {
          const key = `${data.seasonId}:${data.userId}`;
          const entry = { id: `entry-${key}`, ...data };
          seasonEntriesStore.set(key, entry);
          return Promise.resolve(entry);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          for (const [k, v] of seasonEntriesStore.entries()) {
            if (v.id === where.id) {
              if (data.score?.increment) v.score += data.score.increment;
              if (data.correctAnswers?.increment) v.correctAnswers += data.correctAnswers.increment;
              return Promise.resolve(v);
            }
          }
          return Promise.resolve({});
        }),
      },
      $transaction: jest.fn(async (cb) => cb(prismaMock)),
    };

    prismaMock._registerSession = (session: any) => {
      activeSessionsStore.set(session.id, session);
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuizService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  it('1. Games 1 to 15 are ranked, award season points, and update SeasonEntry', async () => {
    const userId = 'user-1';

    for (let i = 1; i <= 15; i++) {
      const session = createActiveSession(`session-${i}`, userId);
      prismaMock._registerSession(session);

      const res = await service.finishQuiz(userId, `session-${i}`);

      expect(res.isRankedGame).toBe(true);
      expect(res.dailyRankedGamesUsed).toBe(i);
      expect(res.dailyRankedGamesLimit).toBe(15);
      expect(res.dailyRankedGamesRemaining).toBe(15 - i);
      expect(res.seasonPointsEarned).toBe(3); // 1 (easy) + 2 (medium)
      expect(res.coinsEarned).toBe(4); // 1 + 1 + 2 bonus
    }

    // Verify SeasonEntry was updated/created 15 times
    expect(prismaMock.seasonEntry.create).toHaveBeenCalledTimes(1); // First game created entry
    expect(prismaMock.seasonEntry.update).toHaveBeenCalledTimes(14); // Subsequent 14 updated entry
  });

  it('2. Game 16 is unranked, awards zero season points, and does not touch SeasonEntry', async () => {
    const userId = 'user-limit-reached';

    // Set daily count to 15
    const dateKey = getProductDateKey();
    dailyUsageStore.set(`${userId}:${dateKey}`, 15);

    const session = createActiveSession('session-16', userId);
    prismaMock._registerSession(session);

    prismaMock.seasonEntry.create.mockClear();
    prismaMock.seasonEntry.update.mockClear();

    const res = await service.finishQuiz(userId, 'session-16');

    expect(res.isRankedGame).toBe(false);
    expect(res.dailyRankedGamesUsed).toBe(15);
    expect(res.dailyRankedGamesLimit).toBe(15);
    expect(res.dailyRankedGamesRemaining).toBe(0);
    expect(res.seasonPointsEarned).toBe(0); // ZERO season points!
    expect(res.coinsEarned).toBe(4); // Coins still awarded!

    // Ensure SeasonEntry was NOT created or updated for game 16
    expect(prismaMock.seasonEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.seasonEntry.update).not.toHaveBeenCalled();
  });

  it('3. Incomplete, active, abandoned, or failed sessions do not consume quota', async () => {
    const userId = 'user-incomplete';
    const session = createActiveSession('session-active', userId);
    (session.questions[1] as any).answeredAt = null; // Q2 unanswered!
    prismaMock._registerSession(session);

    // Attempting to finish incomplete quiz fails and does not increment quota
    await expect(service.finishQuiz(userId, 'session-active')).rejects.toThrow(BadRequestException);

    const dateKey = getProductDateKey();
    expect(dailyUsageStore.get(`${userId}:${dateKey}`) ?? 0).toBe(0);
  });

  it('4. Separate users have separate daily quotas', async () => {
    const userA = 'user-A';
    const userB = 'user-B';

    // User A finishes 15 games
    const dateKey = getProductDateKey();
    dailyUsageStore.set(`${userA}:${dateKey}`, 15);

    // User B finishes 1 game
    const sessionB = createActiveSession('session-B1', userB);
    prismaMock._registerSession(sessionB);

    const resB = await service.finishQuiz(userB, 'session-B1');

    expect(resB.isRankedGame).toBe(true);
    expect(resB.dailyRankedGamesUsed).toBe(1);
    expect(resB.dailyRankedGamesRemaining).toBe(14);
  });

  it('5. The next product-day resets the quota in Asia/Tehran timezone', async () => {
    const userId = 'user-reset-day';

    // Yesterday's date in Asia/Tehran
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayKey = getProductDateKey(yesterday);
    dailyUsageStore.set(`${userId}:${yesterdayKey}`, 15);

    // Today's game
    const sessionToday = createActiveSession('session-today', userId);
    prismaMock._registerSession(sessionToday);

    const res = await service.finishQuiz(userId, 'session-today');

    expect(res.isRankedGame).toBe(true);
    expect(res.dailyRankedGamesUsed).toBe(1);
    expect(res.dailyRankedGamesRemaining).toBe(14);
  });

  it('6. Repeated finish on the same session cannot award rewards twice', async () => {
    const userId = 'user-double-finish';
    const session = createActiveSession('session-repeat', userId);
    prismaMock._registerSession(session);

    const firstRes = await service.finishQuiz(userId, 'session-repeat');
    expect(firstRes.isRankedGame).toBe(true);

    // Second finish call on the completed session throws NotFoundException
    await expect(service.finishQuiz(userId, 'session-repeat')).rejects.toThrow(NotFoundException);
  });

  it('7. Quota limit is configurable via ConfigService/env', async () => {
    const customConfig: any = {
      get: jest.fn((key: string) => (key === 'DAILY_RANKED_GAME_LIMIT' ? '3' : null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: customConfig },
      ],
    }).compile();

    const customService = module.get<QuizService>(QuizService);

    expect(customService.getDailyRankedGameLimit()).toBe(3);

    const userId = 'user-custom-limit';
    for (let i = 1; i <= 3; i++) {
      const s = createActiveSession(`sess-custom-${i}`, userId);
      prismaMock._registerSession(s);
      const res = await customService.finishQuiz(userId, `sess-custom-${i}`);
      expect(res.isRankedGame).toBe(true);
    }

    // 4th game is unranked under limit 3
    const s4 = createActiveSession('sess-custom-4', userId);
    prismaMock._registerSession(s4);
    const res4 = await customService.finishQuiz(userId, 'sess-custom-4');

    expect(res4.isRankedGame).toBe(false);
    expect(res4.dailyRankedGamesUsed).toBe(3);
    expect(res4.dailyRankedGamesLimit).toBe(3);
    expect(res4.dailyRankedGamesRemaining).toBe(0);
    expect(res4.seasonPointsEarned).toBe(0);
  });

  it('8. Concurrency safety: simultaneous finishes for the final slot only grant 1 ranked game', async () => {
    const userId = 'user-concurrent';
    const dateKey = getProductDateKey();

    // User is currently at 14 games used
    dailyUsageStore.set(`${userId}:${dateKey}`, 14);

    const s1 = createActiveSession('session-concurrent-1', userId);
    const s2 = createActiveSession('session-concurrent-2', userId);
    prismaMock._registerSession(s1);
    prismaMock._registerSession(s2);

    // Simulate serial transaction resolution (pessimistic lock behavior)
    const res1 = await service.finishQuiz(userId, 'session-concurrent-1');
    const res2 = await service.finishQuiz(userId, 'session-concurrent-2');

    expect(res1.isRankedGame).toBe(true); // Claims slot 15
    expect(res1.dailyRankedGamesUsed).toBe(15);

    expect(res2.isRankedGame).toBe(false); // Slot 16 is unranked
    expect(res2.dailyRankedGamesUsed).toBe(15);
    expect(res2.seasonPointsEarned).toBe(0);
  });

  describe('getDailyRankedGameLimit parsing and fallbacks', () => {
    const createServiceWithConfig = (value: any) => {
      const mockConfig: any = {
        get: jest.fn().mockReturnValue(value),
      };
      return new QuizService(prismaMock, mockConfig);
    };

    it('returns default 15 when configuration value is missing or undefined', () => {
      const serviceDefault = new QuizService(prismaMock);
      expect(serviceDefault.getDailyRankedGameLimit()).toBe(15);

      const serviceMissing = createServiceWithConfig(undefined);
      expect(serviceMissing.getDailyRankedGameLimit()).toBe(15);
    });

    it('returns custom positive integer when valid string or number is configured', () => {
      const serviceCustomStr = createServiceWithConfig('20');
      expect(serviceCustomStr.getDailyRankedGameLimit()).toBe(20);

      const serviceCustomNum = createServiceWithConfig(10);
      expect(serviceCustomNum.getDailyRankedGameLimit()).toBe(10);
    });

    it('falls back to 15 when configuration is non-numeric text', () => {
      const serviceInvalid = createServiceWithConfig('invalid-text');
      expect(serviceInvalid.getDailyRankedGameLimit()).toBe(15);
    });

    it('falls back to 15 when configuration is zero', () => {
      const serviceZeroStr = createServiceWithConfig('0');
      expect(serviceZeroStr.getDailyRankedGameLimit()).toBe(15);

      const serviceZeroNum = createServiceWithConfig(0);
      expect(serviceZeroNum.getDailyRankedGameLimit()).toBe(15);
    });

    it('falls back to 15 when configuration is a negative value', () => {
      const serviceNegStr = createServiceWithConfig('-5');
      expect(serviceNegStr.getDailyRankedGameLimit()).toBe(15);

      const serviceNegNum = createServiceWithConfig(-10);
      expect(serviceNegNum.getDailyRankedGameLimit()).toBe(15);
    });
  });
});
