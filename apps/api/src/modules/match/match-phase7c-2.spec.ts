import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MatchGateway } from './match.gateway';
import { MatchService } from './match.service';
import { MatchmakingQueue } from './matchmaking-queue';
import { MatchTimerService } from './match-timer.service';
import { MatchPresenceService } from './match-presence.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MatchSocketServerEvents,
  MatchSocketErrorCode,
  MatchStatus,
  QuestionStatus,
  AnswerStatus,
} from '@quiz/contracts';

describe('Phase 7C-2 1v1 Reconnect Snapshots, Presence & Server Timer Recovery Tests', () => {
  let gateway: MatchGateway;
  let service: MatchService;
  let queue: MatchmakingQueue;
  let timerService: MatchTimerService;
  let presenceService: MatchPresenceService;
  let prismaMock: any;

  const JWT_SECRET = 'test_jwt_secret_key_12345';
  const user1 = 'usr_player_1';
  const user2 = 'usr_player_2';
  const matchId = 'match_123';

  let matchDb: any;
  let participantsDb: any[];
  let questionsDb: any[];
  let answersDb: any[];

  function createMockQuestion(id: string, text: string) {
    return {
      id,
      text,
      explanation: 'Secret Explanation',
      imageKey: null,
      difficulty: 'MEDIUM',
      status: QuestionStatus.PUBLISHED,
      authoredById: 'author_1',
      reviewedById: 'reviewer_1',
      deletedAt: null,
      options: [
        { id: `${id}_opt1`, text: 'Option 1 (Correct)', sortOrder: 1, isCorrect: true },
        { id: `${id}_opt2`, text: 'Option 2 (Wrong)', sortOrder: 2, isCorrect: false },
      ],
    };
  }

  const rawQuestions = [
    createMockQuestion('q1', 'Question 1'),
    createMockQuestion('q2', 'Question 2'),
    createMockQuestion('q3', 'Question 3'),
    createMockQuestion('q4', 'Question 4'),
    createMockQuestion('q5', 'Question 5'),
  ];

  function createMockSocket(userId: string, socketId: string) {
    const emittedEvents: Array<{ event: string; payload: any }> = [];
    const joinedRooms: string[] = [];
    const leftRooms: string[] = [];

    const socket: any = {
      id: socketId,
      handshake: { auth: { token: 'valid' } },
      data: { user: { userId, role: 'PLAYER' } },
      emit: jest.fn((event: string, payload: any) => {
        emittedEvents.push({ event, payload });
      }),
      join: jest.fn((room: string) => {
        joinedRooms.push(room);
      }),
      leave: jest.fn((room: string) => {
        leftRooms.push(room);
      }),
      disconnect: jest.fn(),
    };

    return { socket, emittedEvents, joinedRooms, leftRooms };
  }

  beforeEach(async () => {
    jest.useFakeTimers();

    matchDb = {
      id: matchId,
      status: MatchStatus.WAITING,
      currentRound: 0,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
    };

    participantsDb = [
      {
        id: 'part_1',
        matchId,
        userId: user1,
        score: 0,
        coinReward: 0,
        isWinner: false,
        isReady: false,
        user: { id: user1, username: 'player1', displayName: 'Player 1', avatarKey: null },
      },
      {
        id: 'part_2',
        matchId,
        userId: user2,
        score: 0,
        coinReward: 0,
        isWinner: false,
        isReady: false,
        user: { id: user2, username: 'player2', displayName: 'Player 2', avatarKey: null },
      },
    ];

    questionsDb = rawQuestions.map((q, idx) => ({
      id: `mq_${q.id}`,
      matchId,
      questionId: q.id,
      position: idx + 1,
      startsAt: new Date(),
      deadlineAt: new Date(Date.now() + 30000),
      closedAt: null,
      question: q,
    }));

    answersDb = [];

    prismaMock = {
      match: {
        findMany: jest.fn().mockImplementation(async (args?: any) => {
          if (args?.where?.status?.in) {
            if (args.where.status.in.includes(matchDb.status)) {
              return [
                {
                  ...matchDb,
                  participants: participantsDb,
                  questions: questionsDb,
                },
              ];
            }
            return [];
          }
          if (args?.where?.status === matchDb.status) {
            return [
              {
                ...matchDb,
                participants: participantsDb,
                questions: questionsDb,
              },
            ];
          }
          return [];
        }),

        findFirst: jest.fn().mockImplementation(async (args?: any) => {
          if (args?.where?.id && args.where.id !== matchId) return null;
          return {
            ...matchDb,
            participants: participantsDb,
            questions: questionsDb,
          };
        }),

        findUnique: jest.fn().mockImplementation(async (args: any) => {
          if (args.where.id !== matchId) return null;
          let qs = questionsDb;
          if (args.include?.questions?.where?.position) {
            qs = questionsDb.filter((q) => q.position === args.include.questions.where.position);
          } else if (args.include?.questions?.where?.id) {
            qs = questionsDb.filter((q) => q.id === args.include.questions.where.id);
          }
          return {
            ...matchDb,
            participants: participantsDb.map((p) => ({
              ...p,
              answers: answersDb.filter((a) => a.participantId === p.id),
            })),
            questions: qs.map((q) => ({
              ...q,
              answers: answersDb.filter((a) => a.matchQuestionId === q.id),
            })),
          };
        }),

        update: jest.fn().mockImplementation(async (args: any) => {
          Object.assign(matchDb, args.data);
          return matchDb;
        }),

        updateMany: jest.fn().mockImplementation(async (args: any) => {
          if (args.where.status && matchDb.status !== args.where.status) {
            return { count: 0 };
          }
          if (args.where.currentRound !== undefined && matchDb.currentRound !== args.where.currentRound) {
            return { count: 0 };
          }
          Object.assign(matchDb, args.data);
          return { count: 1 };
        }),
      },

      matchParticipant: {
        findFirst: jest.fn().mockImplementation(async (args: any) => {
          return participantsDb.find(
            (p) => p.matchId === args.where.matchId && p.userId === args.where.userId,
          );
        }),

        count: jest.fn().mockImplementation(async (args: any) => {
          if (args.where.isReady) {
            return participantsDb.filter((p) => p.isReady).length;
          }
          return participantsDb.filter(
            (p) =>
              p.matchId === args.where.matchId &&
              (!args.where.userId || p.userId === args.where.userId),
          ).length;
        }),

        update: jest.fn().mockImplementation(async (args: any) => {
          const p = participantsDb.find((item) => item.id === args.where.id);
          if (p) {
            if (args.data.score?.increment) p.score += args.data.score.increment;
            if (args.data.isWinner !== undefined) p.isWinner = args.data.isWinner;
          }
          return p;
        }),

        updateMany: jest.fn().mockImplementation(async (args: any) => {
          let count = 0;
          for (const p of participantsDb) {
            if (p.matchId === args.where.matchId && p.userId === args.where.userId) {
              if (args.where.isReady !== undefined && p.isReady !== args.where.isReady) continue;
              Object.assign(p, args.data);
              count++;
            }
          }
          return { count };
        }),
      },

      matchQuestion: {
        findFirst: jest.fn().mockImplementation(async (args: any) => {
          return questionsDb.find(
            (q) => q.matchId === args.where.matchId && q.position === args.where.position,
          );
        }),

        update: jest.fn().mockImplementation(async (args: any) => {
          const q = questionsDb.find((item) => item.id === args.where.id);
          if (q) Object.assign(q, args.data);
          return q;
        }),

        updateMany: jest.fn().mockImplementation(async (args: any) => {
          const { matchId: mId, position, closedAt } = args.where;
          const q = questionsDb.find(
            (item) =>
              item.matchId === mId && item.position === position && item.closedAt === closedAt,
          );
          if (!q) return { count: 0 };
          Object.assign(q, args.data);
          return { count: 1 };
        }),
      },

      matchAnswer: {
        findFirst: jest.fn().mockImplementation(async (args: any) => {
          return answersDb.find(
            (a) =>
              a.matchQuestionId === args.where.matchQuestionId &&
              a.participantId === args.where.participantId,
          );
        }),

        count: jest.fn().mockImplementation(async (args: any) => {
          return answersDb.filter((a) => a.matchQuestionId === args.where.matchQuestionId).length;
        }),

        create: jest.fn().mockImplementation(async (args: any) => {
          const newAns = {
            id: `ans_${Date.now()}_${Math.random()}`,
            ...args.data,
          };
          answersDb.push(newAns);
          return newAns;
        }),
      },

      question: {
        findMany: jest.fn().mockResolvedValue(rawQuestions),
      },

      $transaction: jest.fn(async (cbOrArray: any) => {
        if (Array.isArray(cbOrArray)) {
          return Promise.all(cbOrArray);
        }
        return cbOrArray(prismaMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchGateway,
        MatchService,
        MatchmakingQueue,
        MatchTimerService,
        MatchPresenceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
      ],
    }).compile();

    gateway = module.get<MatchGateway>(MatchGateway);
    service = module.get<MatchService>(MatchService);
    queue = module.get<MatchmakingQueue>(MatchmakingQueue);
    timerService = module.get<MatchTimerService>(MatchTimerService);
    presenceService = module.get<MatchPresenceService>(MatchPresenceService);

    gateway.server = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      sockets: { sockets: new Map() },
    } as any;

    gateway.afterInit(gateway.server);
  });

  afterEach(async () => {
    timerService.clearAllTimers();
    presenceService.clear();
    await queue.clear();
    jest.useRealTimers();
  });

  // 1. Reconnect during WAITING phase
  it('returns WAITING snapshot when match is in WAITING status', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });
    expect(snapshot.phase).toBe('WAITING');
    expect(snapshot.matchId).toBe(matchId);
    expect(snapshot.matchStatus).toBe(MatchStatus.WAITING);
    expect(snapshot.yourScore).toBe(0);
    expect(snapshot.opponent.userId).toBe(user2);
  });

  // 2. Reconnect during ACTIVE_ROUND phase
  it('returns ACTIVE_ROUND snapshot with original deadline, safe question, and answer state', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;
    const deadline = new Date(Date.now() + 25000);
    questionsDb[0].deadlineAt = deadline;

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });

    expect(snapshot.phase).toBe('ACTIVE_ROUND');
    expect(snapshot.deadlineAt).toBe(deadline.toISOString());
    expect(snapshot.question).toBeDefined();
    expect(snapshot.question.position).toBe(1);
    expect(snapshot.question).not.toHaveProperty('explanation');
    expect(snapshot.question.options[0]).not.toHaveProperty('isCorrect');
    expect(snapshot.yourAnswerState).toEqual({
      answered: false,
      selectedOptionId: null,
      status: null,
    });
  });

  // 3. Original deadline preserved (never reset or extended on reconnect)
  it('preserves exact original deadlineAt during reconnect', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;
    const originalDeadline = new Date(Date.now() + 15000);
    questionsDb[0].deadlineAt = originalDeadline;

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });
    expect(snapshot.deadlineAt).toBe(originalDeadline.toISOString());
  });

  // 4. No answer-key leakage in active round snapshots
  it('never leaks isCorrect or explanation in reconnect snapshot during active round', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });
    expect(snapshot.question).not.toHaveProperty('explanation');
    for (const opt of snapshot.question.options) {
      expect(opt).not.toHaveProperty('isCorrect');
    }
  });

  // 5. Reconnect after submitting an answer
  it('returns submitted answer state when reconnecting after answering', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    answersDb.push({
      id: 'ans_1',
      matchQuestionId: questionsDb[0].id,
      participantId: participantsDb[0].id,
      selectedOptionId: 'q1_opt1',
      status: AnswerStatus.CORRECT,
      answeredAt: new Date(),
    });

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });
    expect(snapshot.phase).toBe('ACTIVE_ROUND');
    expect(snapshot.yourAnswerState).toEqual({
      answered: true,
      selectedOptionId: 'q1_opt1',
      status: AnswerStatus.CORRECT,
    });
  });

  // 6. Reconnect during ROUND_RESULT phase (round closed, transition pending)
  it('returns ROUND_RESULT snapshot with derived transition deadline and roundResult', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 2;

    const closedAt = new Date(Date.now() - 500);
    questionsDb[1].closedAt = closedAt;

    answersDb.push({
      id: 'ans_p1',
      matchQuestionId: questionsDb[1].id,
      participantId: participantsDb[0].id,
      selectedOptionId: 'q2_opt1',
      status: AnswerStatus.CORRECT,
      answeredAt: closedAt,
    });

    answersDb.push({
      id: 'ans_p2',
      matchQuestionId: questionsDb[1].id,
      participantId: participantsDb[1].id,
      selectedOptionId: 'q2_opt2',
      status: AnswerStatus.INCORRECT,
      answeredAt: closedAt,
    });

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });

    expect(snapshot.phase).toBe('ROUND_RESULT');
    const expectedTransitionTime = new Date(closedAt.getTime() + 2000).toISOString();
    expect(snapshot.transitionDeadlineAt).toBe(expectedTransitionTime);
    expect(snapshot.roundResult).toEqual(
      expect.objectContaining({
        matchId,
        round: 2,
        correctOptionId: 'q2_opt1',
        yourStatus: AnswerStatus.CORRECT,
        opponentStatus: AnswerStatus.INCORRECT,
      }),
    );
  });

  // 7. Reconnect after missing one or more rounds
  it('returns latest current round state when reconnecting after missing previous rounds', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 3;

    // Rounds 1 & 2 closed with timeouts for player 1
    questionsDb[0].closedAt = new Date(Date.now() - 60000);
    questionsDb[1].closedAt = new Date(Date.now() - 30000);
    answersDb.push(
      {
        id: 'ans_t1',
        matchQuestionId: questionsDb[0].id,
        participantId: participantsDb[0].id,
        selectedOptionId: null,
        status: AnswerStatus.TIMED_OUT,
        answeredAt: questionsDb[0].closedAt,
      },
      {
        id: 'ans_t2',
        matchQuestionId: questionsDb[1].id,
        participantId: participantsDb[0].id,
        selectedOptionId: null,
        status: AnswerStatus.TIMED_OUT,
        answeredAt: questionsDb[1].closedAt,
      },
    );

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });
    expect(snapshot.phase).toBe('ACTIVE_ROUND');
    expect(snapshot.currentRound).toBe(3);
    expect(snapshot.question.position).toBe(3);
  });

  // 8. Reconnect after match completion
  it('returns COMPLETED snapshot with authoritative finalResult after match completes', async () => {
    matchDb.status = MatchStatus.COMPLETED;
    matchDb.currentRound = 5;
    participantsDb[0].score = 40;
    participantsDb[1].score = 20;
    participantsDb[0].isWinner = true;

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const snapshot: any = await gateway.handleReconnectMatch(s1, { matchId });
    expect(snapshot.phase).toBe('COMPLETED');
    expect(snapshot.finalResult).toEqual({
      matchId,
      winnerId: user1,
      yourScore: 40,
      opponentScore: 20,
      isDraw: false,
    });
  });

  // 9. Unauthorized / non-participant reconnect rejection
  it('rejects reconnect attempt for non-participant user', async () => {
    const { socket: s3 } = createMockSocket('usr_outsider', 's3');
    gateway.handleConnection(s3);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    const res: any = await gateway.handleReconnectMatch(s3, { matchId });
    expect(res.error).toBeDefined();
    expect(res.error.code).toBe(MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT);
  });

  // 10. Presence tracking: multiple sockets & last-socket disconnect
  it('tracks presence correctly across multiple sockets and emits offline only when last socket disconnects', async () => {
    const { socket: s1_tab1 } = createMockSocket(user1, 's1_t1');
    const { socket: s1_tab2 } = createMockSocket(user1, 's1_t2');
    const { socket: s2 } = createMockSocket(user2, 's2');

    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    // Connect Tab 1 for User 1 -> isOnline becomes true
    gateway.handleConnection(s1_tab1);
    await jest.advanceTimersByTimeAsync(0);
    expect(presenceService.isUserConnected(user1)).toBe(true);
    expect(presenceService.getUserSocketCount(user1)).toBe(1);
    expect(mockEmit).toHaveBeenCalledWith(
      MatchSocketServerEvents.OPPONENT_CONNECTION_CHANGED,
      { matchId, userId: user1, isOnline: true },
    );

    mockEmit.mockClear();

    // Connect Tab 2 for User 1 -> count becomes 2, no extra event
    gateway.handleConnection(s1_tab2);
    await jest.advanceTimersByTimeAsync(0);
    expect(presenceService.getUserSocketCount(user1)).toBe(2);
    expect(mockEmit).not.toHaveBeenCalled();

    // Disconnect Tab 1 -> count becomes 1, still online, no offline event
    gateway.handleDisconnect(s1_tab1);
    await jest.advanceTimersByTimeAsync(0);
    expect(presenceService.getUserSocketCount(user1)).toBe(1);
    expect(presenceService.isUserConnected(user1)).toBe(true);
    expect(mockEmit).not.toHaveBeenCalled();

    // Disconnect Tab 2 -> count becomes 0 -> emits offline event
    gateway.handleDisconnect(s1_tab2);
    await jest.advanceTimersByTimeAsync(0);
    expect(presenceService.isUserConnected(user1)).toBe(false);
    expect(mockEmit).toHaveBeenCalledWith(
      MatchSocketServerEvents.OPPONENT_CONNECTION_CHANGED,
      { matchId, userId: user1, isOnline: false },
    );
  });

  // 11. Timer recovery: future active deadline after API restart
  it('recreates active deadline timer using remaining duration on startup recovery', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const futureDeadline = new Date(Date.now() + 10000);
    questionsDb[0].deadlineAt = futureDeadline;

    await service.recoverActiveMatches();

    // Round should not be closed immediately
    expect(questionsDb[0].closedAt).toBeNull();

    // Advance 10 seconds -> recovered timer fires and closes round
    await jest.advanceTimersByTimeAsync(10000);
    expect(questionsDb[0].closedAt).not.toBeNull();
  });

  // 12. Timer recovery: immediate closure of expired round after restart
  it('immediately closes an expired active round during startup recovery', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const expiredDeadline = new Date(Date.now() - 5000);
    questionsDb[0].deadlineAt = expiredDeadline;

    await service.recoverActiveMatches();

    expect(questionsDb[0].closedAt).not.toBeNull();
  });

  // 13. Timer recovery: closed round awaiting transition
  it('schedules remaining transition delay or advances immediately for closed round', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const closedAt = new Date(Date.now() - 1000); // 1 sec ago (1 sec remaining of 2 sec delay)
    questionsDb[0].closedAt = closedAt;

    await service.recoverActiveMatches();

    expect(matchDb.currentRound).toBe(1);

    // Advance 1 sec -> transition fires -> round 2 starts
    await jest.advanceTimersByTimeAsync(1000);
    expect(matchDb.currentRound).toBe(2);
  });

  // 14. Timer recovery: duplicate recovery execution remains idempotent
  it('remains idempotent when recoverActiveMatches is called multiple times', async () => {
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const expiredDeadline = new Date(Date.now() - 5000);
    questionsDb[0].deadlineAt = expiredDeadline;

    await service.recoverActiveMatches();
    await service.recoverActiveMatches();

    expect(matchDb.currentRound).toBe(1);
    expect(questionsDb[0].closedAt).not.toBeNull();
  });
});
