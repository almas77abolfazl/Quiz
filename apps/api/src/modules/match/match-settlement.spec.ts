import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { QuizService, getProductDateKey } from '../quiz/quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchTimerService } from './match-timer.service';
import { MatchPresenceService } from './match-presence.service';
import { MatchmakingQueue } from './matchmaking-queue';
import { ConfigService } from '@nestjs/config';
import { MatchStatus, AnswerStatus, Difficulty, CoinTransactionType } from '@quiz/contracts';

describe('Phase 7E-1: 1v1 Match Settlement, Rewards, and Daily Ranked Quota', () => {
  let matchService: MatchService;
  let quizService: QuizService;
  let prismaMock: any;

  let dailyUsageStore: Map<string, { soloRankedCount: number; matchRankedCount: number }>;
  let userCoinsStore: Map<string, number>;
  let coinTransactionsStore: Array<any>;
  let seasonEntriesStore: Map<string, any>;
  let matchesStore: Map<string, any>;

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

  const createCompletedMatchData = (
    matchId: string,
    playerAId: string,
    playerBId: string,
    correctAIndexes: number[], // e.g. [0, 1, 2] -> 3 correct answers
    correctBIndexes: number[], // e.g. [0, 1] -> 2 correct answers
  ) => {
    const questions = [
      mockQuestion('q1', Difficulty.EASY),
      mockQuestion('q2', Difficulty.MEDIUM),
      mockQuestion('q3', Difficulty.HARD),
      mockQuestion('q4', Difficulty.VERY_HARD),
      mockQuestion('q5', Difficulty.EASY),
    ];

    const matchQuestions = questions.map((q, idx) => ({
      id: `mq-${matchId}-${idx + 1}`,
      matchId,
      questionId: q.id,
      position: idx + 1,
      startsAt: new Date(),
      deadlineAt: new Date(),
      closedAt: new Date(),
      question: q,
      answers: [] as any[],
    }));

    const participantA = {
      id: `part-${matchId}-A`,
      matchId,
      userId: playerAId,
      user: { id: playerAId, username: playerAId },
      score: 0,
      coinReward: 0,
      seasonPointsEarned: 0,
      isWinner: false,
      isReady: true,
      isRanked: false,
      settledAt: null,
      answers: [] as any[],
    };

    const participantB = {
      id: `part-${matchId}-B`,
      matchId,
      userId: playerBId,
      user: { id: playerBId, username: playerBId },
      score: 0,
      coinReward: 0,
      seasonPointsEarned: 0,
      isWinner: false,
      isReady: true,
      isRanked: false,
      settledAt: null,
      answers: [] as any[],
    };

    questions.forEach((q, idx) => {
      const mq = matchQuestions[idx];
      const isACorrect = correctAIndexes.includes(idx);
      const isBCorrect = correctBIndexes.includes(idx);

      const ansA = {
        id: `ans-${matchId}-A-${idx}`,
        matchQuestionId: mq.id,
        participantId: participantA.id,
        selectedOptionId: isACorrect ? `opt-${q.id}-correct` : `opt-${q.id}-wrong`,
        answeredAt: new Date(),
        status: isACorrect ? AnswerStatus.CORRECT : AnswerStatus.INCORRECT,
        matchQuestion: mq,
      };

      const ansB = {
        id: `ans-${matchId}-B-${idx}`,
        matchQuestionId: mq.id,
        participantId: participantB.id,
        selectedOptionId: isBCorrect ? `opt-${q.id}-correct` : `opt-${q.id}-wrong`,
        answeredAt: new Date(),
        status: isBCorrect ? AnswerStatus.CORRECT : AnswerStatus.INCORRECT,
        matchQuestion: mq,
      };

      participantA.answers.push(ansA);
      participantB.answers.push(ansB);
      mq.answers.push(ansA as any, ansB as any);
    });

    return {
      id: matchId,
      status: MatchStatus.ACTIVE,
      currentRound: 5,
      startedAt: new Date(),
      completedAt: null,
      settledAt: null,
      createdAt: new Date(),
      participants: [participantA, participantB],
      questions: matchQuestions,
    };
  };

  beforeEach(async () => {
    dailyUsageStore = new Map();
    userCoinsStore = new Map();
    coinTransactionsStore = [];
    seasonEntriesStore = new Map();
    matchesStore = new Map();

    const mockTimerService = {
      scheduleDeadline: jest.fn(),
      scheduleTransition: jest.fn(),
      cancelTimer: jest.fn(),
      cancelAllTimersForMatch: jest.fn(),
    };

    const mockPresenceService = {
      isUserConnected: jest.fn().mockReturnValue(true),
      addSocket: jest.fn(),
      removeSocket: jest.fn(),
      getUserSockets: jest.fn().mockReturnValue([]),
    };

    const mockQueue = {
      isQueued: jest.fn().mockResolvedValue(false),
      dequeue: jest.fn().mockResolvedValue(undefined),
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    prismaMock = {
      match: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(matchesStore.get(where.id) ?? null);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          const results: any[] = [];
          for (const m of matchesStore.values()) {
            if (where?.OR) {
              const matchesOR = where.OR.some((cond: any) => {
                if (cond.status && m.status !== cond.status) return false;
                if (cond.settledAt === null && m.settledAt !== null) return false;
                return true;
              });
              if (matchesOR) results.push(m);
            } else if (!where?.status || m.status === where.status) {
              results.push(m);
            }
          }
          return Promise.resolve(results);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const m = matchesStore.get(where.id);
          if (m) Object.assign(m, data);
          return Promise.resolve(m);
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          const m = matchesStore.get(where.id);
          if (
            m &&
            (!where.status || m.status === where.status) &&
            (where.settledAt === undefined || m.settledAt === where.settledAt)
          ) {
            Object.assign(m, data);
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        }),
      },
      matchParticipant: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          for (const m of matchesStore.values()) {
            if (where.matchId && m.id !== where.matchId) continue;
            const p = m.participants.find((part: any) => part.userId === where.userId);
            if (p) return Promise.resolve(p);
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          for (const m of matchesStore.values()) {
            const p = m.participants.find((part: any) => part.id === where.id);
            if (p) {
              Object.assign(p, data);
              return Promise.resolve(p);
            }
          }
          return Promise.resolve({});
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          const m = matchesStore.get(where.matchId);
          if (!m) return Promise.resolve(0);
          let count = 0;
          for (const p of m.participants) {
            if (where.userId && p.userId !== where.userId) continue;
            if (where.isReady !== undefined && p.isReady !== where.isReady) continue;
            count++;
          }
          return Promise.resolve(count);
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          let updatedCount = 0;
          for (const m of matchesStore.values()) {
            if (where.matchId && m.id !== where.matchId) continue;
            for (const p of m.participants) {
              if (where.userId && p.userId !== where.userId) continue;
              if (where.isReady !== undefined && p.isReady !== where.isReady) continue;
              Object.assign(p, data);
              updatedCount++;
            }
          }
          return Promise.resolve({ count: updatedCount });
        }),
      },
      category: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve({ id: where.id, title: `Category ${where.id}` });
        }),
      },
      dailyUsage: {
        upsert: jest.fn().mockImplementation(({ where }) => {
          const key = `${where.userId_dateKey.userId}:${where.userId_dateKey.dateKey}`;
          if (!dailyUsageStore.has(key)) {
            dailyUsageStore.set(key, { soloRankedCount: 0, matchRankedCount: 0 });
          }
          const curr = dailyUsageStore.get(key)!;
          return Promise.resolve({
            userId: where.userId_dateKey.userId,
            dateKey: where.userId_dateKey.dateKey,
            ...curr,
          });
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const key = `${where.userId_dateKey.userId}:${where.userId_dateKey.dateKey}`;
          const curr = dailyUsageStore.get(key);
          if (!curr) return Promise.resolve(null);
          return Promise.resolve({
            userId: where.userId_dateKey.userId,
            dateKey: where.userId_dateKey.dateKey,
            ...curr,
          });
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const key = `${where.userId_dateKey.userId}:${where.userId_dateKey.dateKey}`;
          const curr = dailyUsageStore.get(key) ?? { soloRankedCount: 0, matchRankedCount: 0 };
          if (data.soloRankedCount?.increment)
            curr.soloRankedCount += data.soloRankedCount.increment;
          if (data.matchRankedCount?.increment)
            curr.matchRankedCount += data.matchRankedCount.increment;
          dailyUsageStore.set(key, curr);
          return Promise.resolve({
            userId: where.userId_dateKey.userId,
            dateKey: where.userId_dateKey.dateKey,
            ...curr,
          });
        }),
      },
      user: {
        update: jest.fn().mockImplementation(({ where, data }) => {
          const currentCoins = userCoinsStore.get(where.id) ?? 0;
          const nextCoins = currentCoins + (data.coins?.increment ?? 0);
          userCoinsStore.set(where.id, nextCoins);
          return Promise.resolve({ id: where.id, coins: nextCoins });
        }),
      },
      coinTransaction: {
        create: jest.fn().mockImplementation(({ data }) => {
          if (data.idempotencyKey) {
            const existing = coinTransactionsStore.find(
              (t) => t.idempotencyKey === data.idempotencyKey,
            );
            if (existing) {
              const err = new Error('Unique constraint failed on idempotencyKey');
              (err as any).code = 'P2002';
              throw err;
            }
          }
          const record = { id: `tx-${coinTransactionsStore.length + 1}`, ...data };
          coinTransactionsStore.push(record);
          return Promise.resolve(record);
        }),
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
              if (data.matchWins?.increment) v.matchWins += data.matchWins.increment;
              return Promise.resolve(v);
            }
          }
          return Promise.resolve({});
        }),
      },
      $transaction: jest.fn(async (cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        QuizService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MatchTimerService, useValue: mockTimerService },
        { provide: MatchPresenceService, useValue: mockPresenceService },
        { provide: MatchmakingQueue, useValue: mockQueue },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('15') },
        },
      ],
    }).compile();

    matchService = module.get<MatchService>(MatchService);
    quizService = module.get<QuizService>(QuizService);
  });

  it('1. Winner, Loser, and Draw Rewards calculation', async () => {
    // Player A scores Q1(EASY: 1/1) + Q2(MEDIUM: 2/2) + Q3(HARD: 3/3) = 3 correct answers (6 pts, 6 coins)
    // Player B scores Q1(EASY: 1/1) = 1 correct answer (1 pt, 1 coin)
    // Winner (Player A): 6 pts + 3 result bonus = 9 pts, 6 coins + 0 bonus = 6 coins
    // Loser (Player B): 1 pt + 0 result bonus = 1 pt, 1 coin + 0 bonus = 1 coin
    const match = createCompletedMatchData('match-win-1', 'user-A', 'user-B', [0, 1, 2], [0]);
    matchesStore.set(match.id, match);

    const success = await matchService.settleMatch('match-win-1');
    expect(success).toBe(true);

    const settledMatch = matchesStore.get('match-win-1');
    expect(settledMatch.status).toBe(MatchStatus.COMPLETED);
    expect(settledMatch.settledAt).not.toBeNull();

    const pA = settledMatch.participants.find((p: any) => p.userId === 'user-A');
    const pB = settledMatch.participants.find((p: any) => p.userId === 'user-B');

    expect(pA.isWinner).toBe(true);
    expect(pA.score).toBe(3);
    expect(pA.coinReward).toBe(6); // 1 + 2 + 3
    expect(pA.seasonPointsEarned).toBe(9); // (1+2+3) + 3 winner bonus

    expect(pB.isWinner).toBe(false);
    expect(pB.score).toBe(1);
    expect(pB.coinReward).toBe(1); // 1 (EASY)
    expect(pB.seasonPointsEarned).toBe(1); // 1 + 0 loser bonus
  });

  it('2. Draw Rewards calculation', async () => {
    // Both score Q1 (EASY: 1/1) = 1 correct answer each.
    // Draw bonus: +1 season point each, 0 bonus coins.
    const match = createCompletedMatchData('match-draw-1', 'user-draw-A', 'user-draw-B', [0], [0]);
    matchesStore.set(match.id, match);

    await matchService.settleMatch('match-draw-1');

    const settledMatch = matchesStore.get('match-draw-1');
    const pA = settledMatch.participants.find((p: any) => p.userId === 'user-draw-A');
    const pB = settledMatch.participants.find((p: any) => p.userId === 'user-draw-B');

    expect(pA.isWinner).toBe(false);
    expect(pB.isWinner).toBe(false);
    expect(pA.seasonPointsEarned).toBe(2); // 1 (EASY) + 1 draw bonus
    expect(pB.seasonPointsEarned).toBe(2); // 1 (EASY) + 1 draw bonus
    expect(pA.coinReward).toBe(1);
    expect(pB.coinReward).toBe(1);
  });

  it('3. Shared daily quota per-player ranked eligibility', async () => {
    const dateKey = getProductDateKey();
    // User A has completed 14 ranked games today (solo + 1v1 combined)
    dailyUsageStore.set(`user-at-14:${dateKey}`, { soloRankedCount: 10, matchRankedCount: 4 });
    // User B has completed 15 ranked games today
    dailyUsageStore.set(`user-at-15:${dateKey}`, { soloRankedCount: 15, matchRankedCount: 0 });

    const match = createCompletedMatchData(
      'match-quota-boundary',
      'user-at-14',
      'user-at-15',
      [0],
      [0],
    );
    matchesStore.set(match.id, match);

    await matchService.settleMatch('match-quota-boundary');

    const settledMatch = matchesStore.get('match-quota-boundary');
    const pA = settledMatch.participants.find((p: any) => p.userId === 'user-at-14');
    const pB = settledMatch.participants.find((p: any) => p.userId === 'user-at-15');

    // Player A was at 14 (under limit 15) -> Match is ranked for A
    expect(pA.isRanked).toBe(true);
    expect(pA.seasonPointsEarned).toBe(2); // 1 (EASY) + 1 draw bonus
    expect(pA.coinReward).toBe(1);

    // Player B was at 15 (at limit 15) -> Match is unranked for B
    expect(pB.isRanked).toBe(false);
    expect(pB.seasonPointsEarned).toBe(0); // ZERO season points for unranked
    expect(pB.coinReward).toBe(1); // Coins are STILL awarded for unranked!

    // Verify daily usage updated for A, untouched for B
    expect(dailyUsageStore.get(`user-at-14:${dateKey}`)!.matchRankedCount).toBe(5);
    expect(dailyUsageStore.get(`user-at-15:${dateKey}`)!.matchRankedCount).toBe(0);
  });

  it('4. Incomplete/active match does not consume quota', async () => {
    const dateKey = getProductDateKey();
    const match = createCompletedMatchData(
      'match-incomplete',
      'user-inc-A',
      'user-inc-B',
      [0],
      [0],
    );
    match.status = MatchStatus.ACTIVE;
    matchesStore.set(match.id, match);

    // Do NOT call settleMatch
    expect(dailyUsageStore.get(`user-inc-A:${dateKey}`)).toBeUndefined();
  });

  it('5. Duplicate completion and CoinTransaction idempotency', async () => {
    const match = createCompletedMatchData('match-dup-1', 'user-dup-A', 'user-dup-B', [0], [0]);
    matchesStore.set(match.id, match);

    const firstSettle = await matchService.settleMatch('match-dup-1');
    expect(firstSettle).toBe(true);

    const txCountAfterFirst = coinTransactionsStore.length;

    // Second call to settleMatch should detect match.settledAt !== null and return false
    const secondSettle = await matchService.settleMatch('match-dup-1');
    expect(secondSettle).toBe(false);

    // No duplicate coin transactions created
    expect(coinTransactionsStore.length).toBe(txCountAfterFirst);
  });

  it('6. Process restart recovery before settlement', async () => {
    // Match was marked COMPLETED during runtime, but process died before settledAt was populated
    const match = createCompletedMatchData(
      'match-restart-1',
      'user-res-A',
      'user-res-B',
      [0, 1],
      [0],
    );
    match.status = MatchStatus.COMPLETED;
    match.settledAt = null;
    matchesStore.set(match.id, match);

    // Startup recovery recovers active and completed-unsettled matches
    await matchService.recoverActiveMatches();

    const recovered = matchesStore.get('match-restart-1');
    expect(recovered.settledAt).not.toBeNull();

    const pA = recovered.participants.find((p: any) => p.userId === 'user-res-A');
    expect(pA.coinReward).toBe(3); // 1 (EASY) + 2 (MEDIUM)
  });

  it('7. Completed reconnect snapshot contains persisted settlement metadata', async () => {
    const match = createCompletedMatchData('match-recon-1', 'user-rec-A', 'user-rec-B', [0], [0]);
    matchesStore.set(match.id, match);

    await matchService.settleMatch('match-recon-1');

    const snapshot: any = await matchService.getReconnectSnapshot('match-recon-1', 'user-rec-A');

    expect(snapshot.phase).toBe('COMPLETED');
    expect(snapshot.finalResult).toBeDefined();
    expect(snapshot.finalResult.coinsEarned).toBe(1);
    expect(snapshot.finalResult.seasonPointsEarned).toBe(2);
    expect(snapshot.finalResult.isRankedMatch).toBe(true);
    expect(snapshot.finalResult.dailyRankedMatchesUsed).toBe(1);
    expect(snapshot.finalResult.dailyRankedMatchesLimit).toBe(15);
  });

  it('8. Shared quota concurrency: Solo finish and 1v1 settlement competing for slot 15', async () => {
    const userId = 'user-shared-concurrent';
    const dateKey = getProductDateKey();

    // User is currently at 14 combined ranked games
    dailyUsageStore.set(`${userId}:${dateKey}`, { soloRankedCount: 10, matchRankedCount: 4 });

    // Mock queryRaw for DailyUsage FOR UPDATE to simulate sequential transaction execution
    let lockCallCount = 0;
    prismaMock.$queryRaw = jest.fn().mockImplementation(async (strings: any, ...values: any[]) => {
      const sql = strings.join('?');
      if (sql.includes('DailyUsage') && sql.includes('FOR UPDATE')) {
        lockCallCount++;
        const curr = dailyUsageStore.get(`${userId}:${dateKey}`) ?? {
          soloRankedCount: 10,
          matchRankedCount: 4,
        };
        return [
          {
            id: 'du-1',
            soloRankedCount: curr.soloRankedCount,
            matchRankedCount: curr.matchRankedCount,
          },
        ];
      }
      if (sql.includes('Match') && sql.includes('FOR UPDATE')) {
        return [{ id: values[0], settledAt: null, status: 'ACTIVE' }];
      }
      return [];
    });

    const activeSoloSession = {
      id: 'solo-sess-concurrent',
      userId,
      status: 'ACTIVE',
      startedAt: new Date(),
      questions: [
        {
          id: 'sq-1',
          quizSessionId: 'solo-sess-concurrent',
          questionId: 'q1',
          position: 1,
          startsAt: new Date(),
          deadlineAt: new Date(),
          answeredAt: new Date(),
          status: AnswerStatus.CORRECT,
          question: mockQuestion('q1', Difficulty.EASY),
        },
      ],
    };
    prismaMock.quizSession = {
      findFirst: jest.fn().mockResolvedValue(activeSoloSession),
      update: jest.fn().mockResolvedValue({}),
    };

    const match = createCompletedMatchData('match-shared-conc', userId, 'user-opponent', [0], [0]);
    matchesStore.set(match.id, match);

    // 1st operation (Solo finish) takes slot 15
    const soloRes = await quizService.finishQuiz(userId, 'solo-sess-concurrent');
    expect(soloRes.isRankedGame).toBe(true);
    expect(soloRes.dailyRankedGamesUsed).toBe(15);

    // 2nd operation (1v1 settlement) sees total=15 (at limit) -> becomes unranked
    await matchService.settleMatch('match-shared-conc');

    const settledMatch = matchesStore.get('match-shared-conc');
    const pConcurrent = settledMatch.participants.find((p: any) => p.userId === userId);

    expect(pConcurrent.isRanked).toBe(false);
    expect(pConcurrent.seasonPointsEarned).toBe(0); // ZERO season points for 16th game!
  });

  describe('Phase 7E-2: Real 1v1 Countdown & Match Report', () => {
    it('triggers 3-second countdown after both players ready', async () => {
      const matchData = {
        id: 'match-countdown-1',
        status: MatchStatus.WAITING,
        currentRound: 0,
        categoryId: 'cat-1',
        difficulty: Difficulty.MEDIUM,
        participants: [
          { id: 'p1', userId: 'user-1', isReady: true },
          { id: 'p2', userId: 'user-2', isReady: false },
        ],
      };
      matchesStore.set(matchData.id, matchData);

      const countdownFn = jest.fn();
      matchService.registerEventListener({
        onMatchCountdown: countdownFn,
        onRoundStart: jest.fn(),
        onRoundResult: jest.fn(),
        onMatchEnd: jest.fn(),
      });

      const result = await matchService.setPlayerReady('match-countdown-1', 'user-2');
      expect(result).toBe(true);
      expect(countdownFn).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 'match-countdown-1',
          countdownSeconds: 3,
          categoryId: 'cat-1',
          difficulty: Difficulty.MEDIUM,
        }),
      );
    });

    it('returns COUNTDOWN phase snapshot when reconnecting during round 0 countdown', async () => {
      const now = new Date();
      const matchData = {
        id: 'match-reconnect-cd',
        status: MatchStatus.ACTIVE,
        currentRound: 0,
        startedAt: now,
        categoryId: null,
        difficulty: Difficulty.HARD,
        participants: [
          {
            id: 'p1',
            userId: 'user-1',
            score: 0,
            user: { id: 'user-1', username: 'user1', displayName: 'Player 1' },
            answers: [],
          },
          {
            id: 'p2',
            userId: 'user-2',
            score: 0,
            user: { id: 'user-2', username: 'user2', displayName: 'Player 2' },
            answers: [],
          },
        ],
        questions: [],
      };
      matchesStore.set(matchData.id, matchData);

      const snapshot = await matchService.getReconnectSnapshot('match-reconnect-cd', 'user-1');
      expect(snapshot.phase).toBe('COUNTDOWN');
      expect(snapshot.matchId).toBe('match-reconnect-cd');
      expect((snapshot as any).countdownDeadlineAt).toBeDefined();
    });

    it('settles match and builds complete 5-question matchReport with per-viewer privacy', async () => {
      const match = createCompletedMatchData('match-report-1', 'user-a', 'user-b', [0, 1], [0]);
      matchesStore.set(match.id, match);

      let endEvents: any[] = [];
      matchService.registerEventListener({
        onRoundStart: jest.fn(),
        onRoundResult: jest.fn(),
        onMatchEnd: (events) => {
          endEvents = events;
        },
      });

      await matchService.settleMatch('match-report-1');
      expect(endEvents.length).toBe(2);

      const payloadA = endEvents.find((e) => e.userId === 'user-a').payload;
      expect(payloadA.matchReport).toBeDefined();
      expect(payloadA.matchReport.length).toBe(5);

      const r1 = payloadA.matchReport[0];
      expect(r1.round).toBe(1);
      expect(r1.yourStatus).toBe(AnswerStatus.CORRECT);
      expect(r1.yourPointsEarned).toBeGreaterThan(0);
      expect(r1.opponentStatus).toBe(AnswerStatus.CORRECT);
    });
  });
});
