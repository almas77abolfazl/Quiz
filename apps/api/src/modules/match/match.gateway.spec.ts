import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MatchGateway } from './match.gateway';
import { MatchService } from './match.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MatchSocketClientEvents,
  MatchSocketServerEvents,
  MatchSocketErrorCode,
} from '@quiz/contracts';

describe('MatchGateway (Phase 7A Security & Lifecycle)', () => {
  let gateway: MatchGateway;
  let jwtService: JwtService;
  let matchService: jest.Mocked<Partial<MatchService>>;
  let prismaService: jest.Mocked<Partial<PrismaService>>;

  const JWT_SECRET = 'test_jwt_secret_key_12345';
  const validUserId = 'usr_user_111';
  const otherUserId = 'usr_user_222';
  const nonParticipantUserId = 'usr_attacker_999';

  let validToken: string;
  let expiredToken: string;

  beforeAll(async () => {
    jwtService = new JwtService();
    validToken = await jwtService.signAsync(
      { sub: validUserId, role: 'PLAYER' },
      { secret: JWT_SECRET, expiresIn: '15m' },
    );
    expiredToken = await jwtService.signAsync(
      { sub: validUserId, role: 'PLAYER' },
      { secret: JWT_SECRET, expiresIn: '-5s' },
    );
  });

  beforeEach(async () => {
    matchService = {
      joinMatchmaking: jest.fn(),
      processJoinMatchmaking: jest.fn().mockResolvedValue({ status: 'queued' }),
      leaveMatchmaking: jest.fn().mockResolvedValue({ status: 'left' }),
      startMatch: jest.fn(),
      submitAnswer: jest.fn(),
      isParticipant: jest.fn(),
      completeMatch: jest.fn(),
    };

    prismaService = {
      match: { findFirst: jest.fn() } as any,
      matchAnswer: { count: jest.fn(), findMany: jest.fn() } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchGateway,
        { provide: MatchService, useValue: matchService },
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'JWT_SECRET') return JWT_SECRET;
              throw new Error(`Config key ${key} not found`);
            },
          },
        },
      ],
    }).compile();

    gateway = module.get<MatchGateway>(MatchGateway);

    // Mock Socket.IO server
    gateway.server = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      sockets: {
        sockets: new Map(),
      },
    } as any;

    gateway.afterInit(gateway.server);
  });

  function createMockSocket(handshakeAuth?: any, handshakeHeaders?: any, socketId = 'sock_1') {
    const emittedEvents: Array<{ event: string; payload: any }> = [];
    const joinedRooms: string[] = [];
    const leftRooms: string[] = [];
    let disconnected = false;

    const socket: any = {
      id: socketId,
      handshake: {
        auth: handshakeAuth || {},
        headers: handshakeHeaders || {},
      },
      data: {},
      emit: jest.fn((event: string, payload: any) => {
        emittedEvents.push({ event, payload });
      }),
      join: jest.fn((room: string) => {
        joinedRooms.push(room);
      }),
      leave: jest.fn((room: string) => {
        leftRooms.push(room);
      }),
      disconnect: jest.fn(() => {
        disconnected = true;
      }),
    };

    return { socket, emittedEvents, joinedRooms, leftRooms, isDisconnected: () => disconnected };
  }

  // 1 & 2. Connection Authentication & Token Verification Tests
  describe('Connection Authentication & Middleware', () => {
    it('succeeds for valid JWT in auth.token', async () => {
      const { socket } = createMockSocket({ token: validToken });
      const middleware = (gateway.server.use as jest.Mock).mock.calls[0][0];

      let middlewareErr: any;
      await middleware(socket, (err?: any) => {
        middlewareErr = err;
      });

      expect(middlewareErr).toBeUndefined();
      expect(socket.data.user).toEqual({ userId: validUserId, role: 'PLAYER' });

      // Handle connection phase
      gateway.handleConnection(socket);
      expect(socket.join).toHaveBeenCalledWith(`user:${validUserId}`);
      expect(gateway.getUserSocketCount(validUserId)).toBe(1);
    });

    it('succeeds for valid Bearer token in headers.authorization', async () => {
      const { socket } = createMockSocket({}, { authorization: `Bearer ${validToken}` });
      const middleware = (gateway.server.use as jest.Mock).mock.calls[0][0];

      let middlewareErr: any;
      await middleware(socket, (err?: any) => {
        middlewareErr = err;
      });

      expect(middlewareErr).toBeUndefined();
      expect(socket.data.user).toEqual({ userId: validUserId, role: 'PLAYER' });
    });

    it('fails for missing token', async () => {
      const { socket } = createMockSocket({});
      const middleware = (gateway.server.use as jest.Mock).mock.calls[0][0];

      let middlewareErr: any;
      await middleware(socket, (err?: any) => {
        middlewareErr = err;
      });

      expect(middlewareErr).toBeDefined();
      expect(middlewareErr.message).toBe(MatchSocketErrorCode.UNAUTHORIZED);
    });

    it('fails for malformed or invalid token', async () => {
      const { socket } = createMockSocket({ token: 'invalid.jwt.token' });
      const middleware = (gateway.server.use as jest.Mock).mock.calls[0][0];

      let middlewareErr: any;
      await middleware(socket, (err?: any) => {
        middlewareErr = err;
      });

      expect(middlewareErr).toBeDefined();
      expect(middlewareErr.message).toBe(MatchSocketErrorCode.UNAUTHORIZED);
    });

    it('fails for expired token', async () => {
      const { socket } = createMockSocket({ token: expiredToken });
      const middleware = (gateway.server.use as jest.Mock).mock.calls[0][0];

      let middlewareErr: any;
      await middleware(socket, (err?: any) => {
        middlewareErr = err;
      });

      expect(middlewareErr).toBeDefined();
      expect(middlewareErr.message).toBe(MatchSocketErrorCode.UNAUTHORIZED);
    });

    it('disconnects socket if handleConnection is called without user data', () => {
      const { socket, emittedEvents, isDisconnected } = createMockSocket();
      gateway.handleConnection(socket);

      expect(isDisconnected()).toBe(true);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          event: MatchSocketServerEvents.ERROR,
          payload: expect.objectContaining({ code: MatchSocketErrorCode.UNAUTHORIZED }),
        }),
      );
    });
  });

  // 3 & 7 & 8. User Impersonation Prevention Tests
  describe('Impersonation Protection', () => {
    it('ignores client-provided userId payload and uses authenticated token identity', async () => {
      const { socket } = createMockSocket();
      socket.data.user = { userId: validUserId, role: 'PLAYER' };
      gateway.handleConnection(socket);

      (matchService.processJoinMatchmaking as jest.Mock).mockResolvedValue({
        status: 'queued',
      });

      // Attacker tries to pass another user's ID in payload
      const maliciousPayload = { userId: 'usr_victim_888', categoryId: 'cat_1' };

      await gateway.handleJoinMatchmaking(socket, maliciousPayload);

      // Verify MatchService received the authenticated user ID, NOT the victim ID
      expect(matchService.processJoinMatchmaking).toHaveBeenCalledWith(
        validUserId,
        'cat_1',
        undefined,
      );
    });

    it('uses authenticated userId for submitAnswer regardless of payload userId', async () => {
      const { socket } = createMockSocket();
      socket.data.user = { userId: validUserId, role: 'PLAYER' };
      gateway.handleConnection(socket);

      (matchService.isParticipant as jest.Mock).mockResolvedValue(true);
      (matchService.submitAnswer as jest.Mock).mockResolvedValue({
        status: 'CORRECT',
        isCorrect: true,
      });
      (prismaService.match!.findFirst as jest.Mock).mockResolvedValue(null);

      const maliciousPayload = {
        matchId: 'match_123',
        matchQuestionId: 'mq_1',
        selectedOptionId: 'opt_1',
        userId: 'usr_victim_888', // Malicious client attempt
      };

      await gateway.handleSubmitAnswer(socket, maliciousPayload);

      expect(matchService.submitAnswer).toHaveBeenCalledWith(
        'match_123',
        validUserId,
        'mq_1',
        'opt_1',
      );
    });
  });

  // 4 & 9. Participant Authorization Check Tests
  describe('Match Participant Authorization', () => {
    it('rejects submit_answer from an authenticated non-participant', async () => {
      const { socket, emittedEvents } = createMockSocket();
      socket.data.user = { userId: nonParticipantUserId, role: 'PLAYER' };
      gateway.handleConnection(socket);

      // Service returns false for non-participant
      (matchService.isParticipant as jest.Mock).mockResolvedValue(false);

      const res = await gateway.handleSubmitAnswer(socket, {
        matchId: 'match_123',
        matchQuestionId: 'mq_1',
      });

      expect(res).toEqual({
        error: expect.objectContaining({
          code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        }),
      });

      expect(emittedEvents).toContainEqual({
        event: MatchSocketServerEvents.ERROR,
        payload: expect.objectContaining({
          code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        }),
      });

      expect(matchService.submitAnswer).not.toHaveBeenCalled();
    });

    it('rejects reconnect_match from an authenticated non-participant', async () => {
      const { socket, emittedEvents } = createMockSocket();
      socket.data.user = { userId: nonParticipantUserId, role: 'PLAYER' };

      (matchService.isParticipant as jest.Mock).mockResolvedValue(false);

      const res = await gateway.handleReconnectMatch(socket, { matchId: 'match_123' });

      expect(res).toEqual({
        error: expect.objectContaining({
          code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        }),
      });

      expect(emittedEvents).toContainEqual({
        event: MatchSocketServerEvents.ERROR,
        payload: expect.objectContaining({ code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT }),
      });
    });

    it('rejects leave_match from an authenticated non-participant', async () => {
      const { socket, emittedEvents } = createMockSocket();
      socket.data.user = { userId: nonParticipantUserId, role: 'PLAYER' };

      (matchService.isParticipant as jest.Mock).mockResolvedValue(false);

      const res = await gateway.handleLeaveMatch(socket, { matchId: 'match_123' });

      expect(res).toEqual({
        error: expect.objectContaining({
          code: MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        }),
      });
    });
  });

  // 5 & 6 & 7. Connection Lifecycle, Disconnect, Reconnect & Multi-socket Tests
  describe('Connection Lifecycle & Multi-socket Handling', () => {
    it('safely handles multiple active sockets for the same user without corruption', () => {
      const { socket: s1 } = createMockSocket({}, {}, 'sock_tab1');
      s1.data.user = { userId: validUserId, role: 'PLAYER' };
      gateway.handleConnection(s1);

      const { socket: s2 } = createMockSocket({}, {}, 'sock_tab2');
      s2.data.user = { userId: validUserId, role: 'PLAYER' };
      gateway.handleConnection(s2);

      expect(gateway.getUserSocketCount(validUserId)).toBe(2);

      // Disconnect s1 (Tab 1 closed)
      gateway.handleDisconnect(s1);
      expect(gateway.getUserSocketCount(validUserId)).toBe(1);

      // Disconnect s2 (Tab 2 closed)
      gateway.handleDisconnect(s2);
      expect(gateway.getUserSocketCount(validUserId)).toBe(0);
    });

    it('reconnects user with new socket identity safely', async () => {
      const { socket: newSocket, joinedRooms } = createMockSocket({}, {}, 'sock_reconnected');
      newSocket.data.user = { userId: validUserId, role: 'PLAYER' };
      gateway.handleConnection(newSocket);

      (matchService.isParticipant as jest.Mock).mockResolvedValue(true);
      (prismaService.match!.findFirst as jest.Mock).mockResolvedValue({
        id: 'match_123',
        status: 'ACTIVE',
        participants: [{ userId: validUserId }, { userId: otherUserId }],
      });

      const res = await gateway.handleReconnectMatch(newSocket, { matchId: 'match_123' });

      expect(res).toEqual({
        status: 'reconnected',
        matchId: 'match_123',
        matchStatus: 'ACTIVE',
      });

      expect(joinedRooms).toContain('match:match_123');
    });
  });

  // 8. Payload Validation Tests
  describe('Payload Validation', () => {
    it('returns INVALID_PAYLOAD error for non-object payload', async () => {
      const { socket, emittedEvents } = createMockSocket();
      socket.data.user = { userId: validUserId, role: 'PLAYER' };

      const res = await gateway.handleSubmitAnswer(socket, 'not-an-object');

      expect(res).toEqual({
        error: expect.objectContaining({
          code: MatchSocketErrorCode.INVALID_PAYLOAD,
        }),
      });

      expect(emittedEvents).toContainEqual({
        event: MatchSocketServerEvents.ERROR,
        payload: expect.objectContaining({ code: MatchSocketErrorCode.INVALID_PAYLOAD }),
      });
    });

    it('returns INVALID_PAYLOAD error for missing required fields in submit_answer', async () => {
      const { socket, emittedEvents } = createMockSocket();
      socket.data.user = { userId: validUserId, role: 'PLAYER' };

      // Invalid payload: missing matchId and matchQuestionId
      const res = await gateway.handleSubmitAnswer(socket, { selectedOptionId: 'opt_1' });

      expect(res).toEqual({
        error: expect.objectContaining({
          code: MatchSocketErrorCode.INVALID_PAYLOAD,
        }),
      });
    });
  });

  // 9. Pre-Answer Question Payload Integrity (No Answer Keys Leaked)
  describe('Question Payload Integrity (No Answer Key Leakage)', () => {
    it('sanitizes match_found question payload to contain no isCorrect or answer keys', async () => {
      const { socket } = createMockSocket();
      socket.data.user = { userId: validUserId, role: 'PLAYER' };
      gateway.handleConnection(socket);

      // Question in DB contains secret isCorrect flag
      const rawQuestionFromDb = {
        id: 'mq_1',
        position: 1,
        question: {
          id: 'q_100',
          text: 'What is 2+2?',
          options: [
            { id: 'opt_a', text: '3', isCorrect: false, sortOrder: 1 },
            { id: 'opt_b', text: '4', isCorrect: true, sortOrder: 2 },
          ],
        },
      };

      (matchService.processJoinMatchmaking as jest.Mock).mockResolvedValue({
        status: 'matched',
        match: {
          id: 'match_123',
          participants: [
            { userId: validUserId, user: { id: validUserId, username: 'p1' } },
            { userId: otherUserId, user: { id: otherUserId, username: 'p2' } },
          ],
          questions: [rawQuestionFromDb],
        },
      });

      const mockEmit = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: mockEmit });

      await gateway.handleJoinMatchmaking(socket, {});

      // Locate match_found broadcast call
      const matchFoundCall = mockEmit.mock.calls.find(
        (call) => call[0] === MatchSocketServerEvents.MATCH_FOUND,
      );
      expect(matchFoundCall).toBeDefined();

      const emittedQuestion = matchFoundCall[1].questions[0];

      // Verify question options have ONLY id and text, and NO isCorrect
      expect(emittedQuestion.options).toEqual([
        { id: 'opt_a', text: '3' },
        { id: 'opt_b', text: '4' },
      ]);
      expect(emittedQuestion.options[0]).not.toHaveProperty('isCorrect');
      expect(emittedQuestion.options[1]).not.toHaveProperty('isCorrect');
    });
  });

  // 10. Event Throttling Tests
  describe('Event Throttling & Rate Limiting', () => {
    it('blocks high-frequency rapid event spam with RATE_LIMIT_EXCEEDED but permits normal play', async () => {
      const { socket, emittedEvents } = createMockSocket();
      socket.data.user = { userId: validUserId, role: 'PLAYER' };

      (matchService.joinMatchmaking as jest.Mock).mockResolvedValue({
        id: 'match_123',
        participants: [{ userId: validUserId }],
      });

      // 10 rapid calls within 1 second should succeed
      for (let i = 0; i < 10; i++) {
        const res = await gateway.handleJoinMatchmaking(socket, {});
        expect(res).not.toHaveProperty('error.code', MatchSocketErrorCode.RATE_LIMIT_EXCEEDED);
      }

      // 11th rapid call within the same second must be throttled
      const throttledRes = await gateway.handleJoinMatchmaking(socket, {});

      expect(throttledRes).toEqual({
        error: expect.objectContaining({
          code: MatchSocketErrorCode.RATE_LIMIT_EXCEEDED,
        }),
      });

      expect(emittedEvents).toContainEqual({
        event: MatchSocketServerEvents.ERROR,
        payload: expect.objectContaining({ code: MatchSocketErrorCode.RATE_LIMIT_EXCEEDED }),
      });
    });
  });
});
