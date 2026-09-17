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
  MatchSocketErrorCode,
  MatchStatus,
  QuestionStatus,
} from '@quiz/contracts';

describe('Phase 7B 1v1 Matchmaking Tests', () => {
  let gateway: MatchGateway;
  let service: MatchService;
  let queue: MatchmakingQueue;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  const JWT_SECRET = 'test_jwt_secret_key_12345';
  const user1 = 'usr_player_1';
  const user2 = 'usr_player_2';

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
        { id: `${id}_opt1`, text: 'Option 1', sortOrder: 1, isCorrect: true },
        { id: `${id}_opt2`, text: 'Option 2', sortOrder: 2, isCorrect: false },
      ],
    };
  }

  const mockQuestions = [
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
    prisma = {
      match: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      } as any,
      question: {
        findMany: jest.fn().mockResolvedValue(mockQuestions),
      } as any,
      $transaction: jest.fn(async (cb: any) => {
        const txPrisma = {
          match: {
            create: jest.fn().mockImplementation((args: any) => {
              const createdMatch = {
                id: 'match_123',
                status: MatchStatus.ACTIVE,
                participants: [
                  {
                    userId: args.data.participants.create[0].userId,
                    user: {
                      id: args.data.participants.create[0].userId,
                      username: `user_${args.data.participants.create[0].userId}`,
                      displayName: `Display ${args.data.participants.create[0].userId}`,
                      avatarKey: 'avatar.png',
                      phone: '+1234567890',
                    },
                  },
                  {
                    userId: args.data.participants.create[1].userId,
                    user: {
                      id: args.data.participants.create[1].userId,
                      username: `user_${args.data.participants.create[1].userId}`,
                      displayName: `Display ${args.data.participants.create[1].userId}`,
                      avatarKey: 'avatar.png',
                      phone: '+0987654321',
                    },
                  },
                ],
                questions: args.data.questions.create.map((q: any) => {
                  const origQ = mockQuestions.find((mq) => mq.id === q.questionId)!;
                  return {
                    id: `mq_${q.questionId}`,
                    questionId: q.questionId,
                    position: q.position,
                    question: origQ,
                  };
                }),
              };
              return createdMatch;
            }),
          },
        };
        return cb(txPrisma);
      }) as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchGateway,
        MatchService,
        MatchmakingQueue,
        MatchTimerService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { getOrThrow: () => JWT_SECRET } },
      ],
    }).compile();

    gateway = module.get<MatchGateway>(MatchGateway);
    service = module.get<MatchService>(MatchService);
    queue = module.get<MatchmakingQueue>(MatchmakingQueue);

    gateway.server = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      sockets: { sockets: new Map() },
    } as any;
  });

  afterEach(async () => {
    await queue.clear();
  });

  // 1. two different users are matched once
  it('matches two different users exactly once when both join', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const res1 = await gateway.handleJoinMatchmaking(s1, {});
    expect(res1).toEqual({ status: 'queued', matchId: undefined });
    expect(await queue.isQueued(user1)).toBe(true);

    const res2 = await gateway.handleJoinMatchmaking(s2, {});
    expect(res2).toEqual({ status: 'matched', matchId: 'match_123' });
    expect(await queue.isQueued(user1)).toBe(false);
    expect(await queue.isQueued(user2)).toBe(false);
  });

  // 2. a user cannot match themselves
  it('prevents a user from matching with themselves', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    await gateway.handleJoinMatchmaking(s1, {});
    await gateway.handleJoinMatchmaking(s1, {});

    expect(await queue.getQueueSize()).toBe(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // 3. repeated join is idempotent
  it('repeated join is idempotent and does not duplicate queue entries', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const res1 = await gateway.handleJoinMatchmaking(s1, {});
    const res2 = await gateway.handleJoinMatchmaking(s1, {});

    expect(res1).toEqual({ status: 'queued', matchId: undefined });
    expect(res2).toEqual({ status: 'queued', matchId: undefined });
    expect(await queue.getQueueSize()).toBe(1);
  });

  // 4. multiple sockets for one user create one queue entry
  it('multiple sockets for one user create only one queue entry', async () => {
    const { socket: s1 } = createMockSocket(user1, 'tab_1');
    const { socket: s2 } = createMockSocket(user1, 'tab_2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    expect(gateway.getUserSocketCount(user1)).toBe(2);

    await gateway.handleJoinMatchmaking(s1, {});
    await gateway.handleJoinMatchmaking(s2, {});

    expect(await queue.getQueueSize()).toBe(1);
    expect(await queue.isQueued(user1)).toBe(true);
  });

  // 5. concurrent joins do not create duplicate matches
  it('concurrent joins create at most one match for two distinct players', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const [res1, res2] = await Promise.all([
      gateway.handleJoinMatchmaking(s1, {}),
      gateway.handleJoinMatchmaking(s2, {}),
    ]);

    const matchedCount = [res1, res2].filter((r: any) => r.status === 'matched').length;
    const queuedCount = [res1, res2].filter((r: any) => r.status === 'queued').length;

    expect(matchedCount).toBe(1);
    expect(queuedCount).toBe(1);
    expect(await queue.getQueueSize()).toBe(0);
  });

  // 6. a matched user cannot enter another queue
  it('returns existing match if a queued/joining user already has a waiting/active match', async () => {
    const existingMatchObj = {
      id: 'active_match_999',
      status: MatchStatus.ACTIVE,
      participants: [
        { userId: user1, user: { id: user1, username: 'p1' } },
        { userId: user2, user: { id: user2, username: 'p2' } },
      ],
      questions: [],
    };
    (prisma.match!.findFirst as jest.Mock).mockResolvedValue(existingMatchObj);

    const { socket: s1 } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    const res = await gateway.handleJoinMatchmaking(s1, {});
    expect(res).toEqual({ status: 'matched', matchId: 'active_match_999' });
    expect(await queue.isQueued(user1)).toBe(false);
  });

  // 7. leaving queue works
  it('removes searching user from queue when leave_matchmaking is emitted', async () => {
    const { socket: s1, emittedEvents } = createMockSocket(user1, 's1');
    gateway.handleConnection(s1);

    await gateway.handleJoinMatchmaking(s1, {});
    expect(await queue.isQueued(user1)).toBe(true);

    const leaveRes = await gateway.handleLeaveMatchmaking(s1);
    expect(leaveRes).toEqual({ status: 'left' });
    expect(await queue.isQueued(user1)).toBe(false);
    expect(emittedEvents).toContainEqual({
      event: MatchSocketServerEvents.MATCHMAKING_LEFT,
      payload: { status: 'left' },
    });
  });

  // 8. one-tab disconnect keeps queue when another socket remains
  it('keeps user queued if one socket disconnects while another socket for same user remains', async () => {
    const { socket: tab1 } = createMockSocket(user1, 'tab1');
    const { socket: tab2 } = createMockSocket(user1, 'tab2');
    gateway.handleConnection(tab1);
    gateway.handleConnection(tab2);

    await gateway.handleJoinMatchmaking(tab1, {});
    expect(await queue.isQueued(user1)).toBe(true);

    // Disconnect tab 1
    gateway.handleDisconnect(tab1);
    expect(gateway.getUserSocketCount(user1)).toBe(1);
    expect(await queue.isQueued(user1)).toBe(true);
  });

  // 9. final disconnect removes searching user
  it('removes searching user from queue when final socket disconnects', async () => {
    const { socket: tab1 } = createMockSocket(user1, 'tab1');
    gateway.handleConnection(tab1);

    await gateway.handleJoinMatchmaking(tab1, {});
    expect(await queue.isQueued(user1)).toBe(true);

    gateway.handleDisconnect(tab1);
    expect(gateway.getUserSocketCount(user1)).toBe(0);
    expect(await queue.isQueued(user1)).toBe(false);
  });

  // 10. both players receive match_found with totalRounds: 5
  it('provides totalRounds: 5 in match_found to both players', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    await gateway.handleJoinMatchmaking(s1, {});
    await gateway.handleJoinMatchmaking(s2, {});

    const matchFoundCalls = mockEmit.mock.calls.filter(
      (c) => c[0] === MatchSocketServerEvents.MATCH_FOUND,
    );
    expect(matchFoundCalls.length).toBe(2);

    const payloadUser1 = matchFoundCalls.find((c) => c[1].opponent.userId === user2)[1];
    const payloadUser2 = matchFoundCalls.find((c) => c[1].opponent.userId === user1)[1];

    expect(payloadUser1.totalRounds).toBe(5);
    expect(payloadUser2.totalRounds).toBe(5);
    expect(payloadUser1.questions).toBeUndefined();
    expect(payloadUser2.questions).toBeUndefined();
  });

  // 11. match_found payload contains no answer keys/private data or questions list
  it('ensures match_found payload contains only totalRounds and public opponent info without question leakage', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

    await gateway.handleJoinMatchmaking(s1, {});
    await gateway.handleJoinMatchmaking(s2, {});

    const call = mockEmit.mock.calls.find((c) => c[0] === MatchSocketServerEvents.MATCH_FOUND);
    const payload = call[1];

    // Check public opponent data
    expect(payload.opponent).toEqual({
      userId: expect.any(String),
      username: expect.any(String),
      displayName: expect.any(String),
      avatarKey: 'avatar.png',
    });
    expect(payload.opponent).not.toHaveProperty('phone');
    expect(payload.opponent).not.toHaveProperty('coins');

    // Questions must NOT be exposed in match_found
    expect(payload).not.toHaveProperty('questions');
    expect(payload.totalRounds).toBe(5);
  });

  // 12. insufficient question pool creates no partial match
  it('does not create partial match if eligible questions count is less than 5', async () => {
    (prisma.question!.findMany as jest.Mock).mockResolvedValue(mockQuestions.slice(0, 3));

    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    await gateway.handleJoinMatchmaking(s1, {});
    expect(await queue.isQueued(user1)).toBe(true);

    const res2 = await gateway.handleJoinMatchmaking(s2, {});

    expect(res2).toEqual({
      error: expect.objectContaining({
        code: MatchSocketErrorCode.INSUFFICIENT_QUESTIONS,
      }),
    });

    // Queue state restored: player 1 remains in queue, player 2 is not
    expect(await queue.isQueued(user1)).toBe(true);
    expect(await queue.isQueued(user2)).toBe(false);
  });

  // 13. database failure leaves queue consistent
  it('restores queue consistency if database transaction fails during match creation', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('DB Transaction Failed'));

    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    await gateway.handleJoinMatchmaking(s1, {});
    expect(await queue.isQueued(user1)).toBe(true);

    const res2 = await gateway.handleJoinMatchmaking(s2, {});

    expect(res2).toEqual({
      error: expect.objectContaining({
        code: MatchSocketErrorCode.INTERNAL_ERROR,
      }),
    });

    // Player 1 restored to queue
    expect(await queue.isQueued(user1)).toBe(true);
    expect(await queue.isQueued(user2)).toBe(false);
  });

  // 14. both user rooms receive match_found
  it('emits match_found to both user rooms (user:id1 and user:id2)', async () => {
    const { socket: s1 } = createMockSocket(user1, 's1');
    const { socket: s2 } = createMockSocket(user2, 's2');
    gateway.handleConnection(s1);
    gateway.handleConnection(s2);

    const mockEmit = jest.fn();
    (gateway.server.to as jest.Mock).mockImplementation((room: string) => ({
      emit: mockEmit,
    }));

    await gateway.handleJoinMatchmaking(s1, {});
    await gateway.handleJoinMatchmaking(s2, {});

    expect(gateway.server.to).toHaveBeenCalledWith(`user:${user1}`);
    expect(gateway.server.to).toHaveBeenCalledWith(`user:${user2}`);
  });
});
