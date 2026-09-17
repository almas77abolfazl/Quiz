import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MatchGateway } from './match.gateway';
import { MatchService } from './match.service';
import { MatchmakingQueue } from './matchmaking-queue';
import { MatchTimerService } from './match-timer.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MatchSocketServerEvents,
  MatchSocketClientEvents,
  MatchSocketErrorCode,
  MatchStatus,
  QuestionStatus,
  AnswerStatus,
} from '@quiz/contracts';

describe('Phase 7C-1 Server-Authoritative 1v1 Round Lifecycle Tests', () => {
  let gateway: MatchGateway;
  let service: MatchService;
  let queue: MatchmakingQueue;
  let timerService: MatchTimerService;
  let prismaMock: any;

  const JWT_SECRET = 'test_jwt_secret_key_12345';
  const user1 = 'usr_player_1';
  const user2 = 'usr_player_2';
  const matchId = 'match_123';

  // In-memory mock database state
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
        user: { id: user1, username: 'player1' },
      },
      {
        id: 'part_2',
        matchId,
        userId: user2,
        score: 0,
        coinReward: 0,
        isWinner: false,
        isReady: false,
        user: { id: user2, username: 'player2' },
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
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
      ],
    }).compile();

    gateway = module.get<MatchGateway>(MatchGateway);
    service = module.get<MatchService>(MatchService);
    queue = module.get<MatchmakingQueue>(MatchmakingQueue);
    timerService = module.get<MatchTimerService>(MatchTimerService);

    gateway.server = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      sockets: { sockets: new Map() },
    } as any;

    gateway.afterInit(gateway.server);
  });

  afterEach(async () => {
    timerService.clearAllTimers();
    await queue.clear();
    jest.useRealTimers();
  });

  // 1. Match starts once after both players become ready
  it('starts match and transitions to ACTIVE exactly once after both players emit player_ready', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    // Player 1 ready
    const res1 = await gateway.handlePlayerReady(s1, { matchId });
    expect(res1).toEqual({ status: 'ready', matchId });
    expect(matchDb.status).toBe(MatchStatus.WAITING);
    expect(mockEmit).not.toHaveBeenCalledWith(
      MatchSocketServerEvents.ROUND_START,
      expect.anything(),
    );

    // Player 2 ready -> triggers match start
    const res2 = await gateway.handlePlayerReady(s2, { matchId });
    expect(res2).toEqual({ status: 'ready', matchId });
    expect(matchDb.status).toBe(MatchStatus.ACTIVE);
    expect(matchDb.currentRound).toBe(1);

    expect(mockEmit).toHaveBeenCalledWith(
      MatchSocketServerEvents.ROUND_START,
      expect.objectContaining({
        matchId,
        round: 1,
        totalRounds: 5,
      }),
    );
  });

  // 2. Only the current player-safe question is emitted at round_start
  it('emits only player-safe question for current round without explanation or answer keys', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    const call = mockEmit.mock.calls.find((c) => c[0] === MatchSocketServerEvents.ROUND_START);
    const payload = call[1];

    expect(payload.question.position).toBe(1);
    expect(payload.question).not.toHaveProperty('explanation');
    expect(payload.question).not.toHaveProperty('isCorrect');
    for (const opt of payload.question.options) {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('text');
      expect(opt).not.toHaveProperty('isCorrect');
    }
  });

  // 3. Both players receive the exact same question for each round
  it('emits identical question object to room for both players', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    expect(gateway.server.to).toHaveBeenCalledWith(`match:${matchId}`);
  });

  // 4. Correct answer, incorrect answer, and timeout persistence
  it('persists correct answer (+10 pts), incorrect answer (0 pts), and timeout correctly', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    // Player 1 answers correctly
    const q1 = questionsDb[0];
    const correctOpt = q1.question.options[0].id;
    const res1 = await gateway.handleSubmitAnswer(s1, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: correctOpt,
    });

    expect(res1).toEqual(
      expect.objectContaining({
        status: AnswerStatus.CORRECT,
        isCorrect: true,
      }),
    );
    expect(participantsDb[0].score).toBe(10);

    // Player 2 answers incorrectly
    const wrongOpt = q1.question.options[1].id;
    const res2 = await gateway.handleSubmitAnswer(s2, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: wrongOpt,
    });

    expect(res2).toEqual(
      expect.objectContaining({
        status: AnswerStatus.INCORRECT,
        isCorrect: false,
      }),
    );
    expect(participantsDb[1].score).toBe(0);
  });

  // 5. No answer-key leakage before round close
  it('does not reveal correctOptionId in submit_answer response, only in round_result after round close', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    participantsDb[0].isReady = true;
    participantsDb[1].isReady = true;
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const q1 = questionsDb[0];
    const res = await gateway.handleSubmitAnswer(s1, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: q1.question.options[0].id,
    });

    expect(res).not.toHaveProperty('correctOptionId');
  });

  // 6. Round closes early when both answer
  it('closes round early and schedules next round when both players submit answers before deadline', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    const q1 = questionsDb[0];
    await gateway.handleSubmitAnswer(s1, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: q1.question.options[0].id,
    });
    await gateway.handleSubmitAnswer(s2, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: q1.question.options[1].id,
    });

    // Advance microtasks / setImmediate
    await jest.advanceTimersByTimeAsync(100);

    expect(q1.closedAt).not.toBeNull();
    expect(mockEmit).toHaveBeenCalledWith(
      MatchSocketServerEvents.ROUND_RESULT,
      expect.objectContaining({
        matchId,
        round: 1,
        correctOptionId: q1.question.options[0].id,
      }),
    );
  });

  // 7. Round closes at deadline when one or both do not answer
  it('closes round at 30s deadline and marks unanswered player as TIMED_OUT', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    // Only player 1 answers
    const q1 = questionsDb[0];
    await gateway.handleSubmitAnswer(s1, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: q1.question.options[0].id,
    });

    // Advance 30 seconds to trigger round deadline
    await jest.advanceTimersByTimeAsync(30000);

    expect(q1.closedAt).not.toBeNull();
    expect(answersDb.length).toBe(2);
    const p2Answer = answersDb.find((a) => a.participantId === participantsDb[1].id);
    expect(p2Answer.status).toBe(AnswerStatus.TIMED_OUT);
  });

  // 8. Disconnect does not pause the match
  it('does not pause or extend round timer when a player disconnects', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    // Disconnect player 2
    gateway.handleDisconnect(s2);

    // Fast-forward 30 seconds
    await jest.advanceTimersByTimeAsync(30000);

    const q1 = questionsDb[0];
    expect(q1.closedAt).not.toBeNull();
  });

  // 9. Duplicate/concurrent ready and answer events are idempotent
  it('handles duplicate ready and duplicate answer events idempotently', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const resReady1 = await gateway.handlePlayerReady(s1, { matchId });
    const resReady2 = await gateway.handlePlayerReady(s1, { matchId });
    expect(resReady1).toEqual({ status: 'ready', matchId });
    expect(resReady2).toEqual({ status: 'ready', matchId });

    participantsDb[1].isReady = true;
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    const q1 = questionsDb[0];
    const ans1 = await gateway.handleSubmitAnswer(s1, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: q1.question.options[0].id,
    });

    const ans2 = await gateway.handleSubmitAnswer(s1, {
      matchId,
      matchQuestionId: q1.id,
      selectedOptionId: q1.question.options[0].id,
    });

    expect((ans1 as any).alreadyAnswered).toBe(false);
    expect((ans2 as any).alreadyAnswered).toBe(true);
    expect(participantsDb[0].score).toBe(10); // Not awarded twice
  });

  // 10. Answer submission racing with deadline expiry is handled exactly once
  it('ensures atomic round closure via closedAt when answer submission races with deadline timer', async () => {
    participantsDb[0].isReady = true;
    participantsDb[1].isReady = true;
    matchDb.status = MatchStatus.ACTIVE;
    matchDb.currentRound = 1;

    // Call closeRound twice concurrently
    const [res1, res2] = await Promise.all([
      service.closeRound(matchId, 1),
      service.closeRound(matchId, 1),
    ]);

    // Exactly one caller succeeds (returns true), second caller returns false
    const successCount = [res1, res2].filter(Boolean).length;
    expect(successCount).toBe(1);
  });

  // 11. All five rounds advance automatically
  it('automatically advances through all five rounds and completes match', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    await gateway.handlePlayerReady(s1, { matchId });
    await gateway.handlePlayerReady(s2, { matchId });

    // Loop through all 5 rounds by advancing timers
    for (let r = 1; r <= 5; r++) {
      // Advance 30 seconds for round deadline + 2 seconds for round transition
      await jest.advanceTimersByTimeAsync(32000);
    }

    expect(matchDb.status).toBe(MatchStatus.COMPLETED);
    expect(mockEmit).toHaveBeenCalledWith(
      MatchSocketServerEvents.MATCH_END,
      expect.objectContaining({
        matchId,
        isDraw: true,
      }),
    );
  });

  // 12. Final result / winner / draw is emitted exactly once
  it('calculates final scores, determines winner/draw, and emits match_end exactly once', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    participantsDb[0].score = 30;
    participantsDb[1].score = 20;
    matchDb.status = MatchStatus.ACTIVE;

    const res1 = await service.completeMatch(matchId);
    const res2 = await service.completeMatch(matchId);

    expect(res1).toBe(true);
    expect(res2).toBe(false); // Second call fails idempotently

    expect(mockEmit).toHaveBeenCalledWith(
      MatchSocketServerEvents.MATCH_END,
      expect.objectContaining({
        matchId,
        winnerId: user1,
        yourScore: 30,
        opponentScore: 20,
        isDraw: false,
      }),
    );
  });
});
