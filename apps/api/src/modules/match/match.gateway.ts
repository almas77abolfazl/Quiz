import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  MatchSocketClientEvents,
  MatchSocketServerEvents,
  MatchSocketErrorCode,
  MatchSocketErrorPayload,
  MatchFoundS2CPayload,
  MatchmakingJoinedS2CPayload,
  MatchmakingLeftS2CPayload,
  MatchQuestionOptionClient,
} from '@quiz/contracts';
import { MatchService } from './match.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  JoinMatchmakingSocketDto,
  SubmitAnswerSocketDto,
  ReconnectMatchSocketDto,
  LeaveMatchSocketDto,
} from './dto/match-socket.dto';

export interface AuthenticatedSocketData {
  user?: {
    userId: string;
    role: string;
  };
  eventTimestamps?: number[];
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' },
})
export class MatchGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Track active authenticated socket connections: userId -> Set of socket IDs
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly matchService: MatchService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket & { data: AuthenticatedSocketData }, next) => {
      try {
        const token = this.extractToken(socket);
        if (!token) {
          const err = new Error(MatchSocketErrorCode.UNAUTHORIZED);
          (err as any).data = {
            code: MatchSocketErrorCode.UNAUTHORIZED,
            message: 'Authentication token missing',
          } satisfies MatchSocketErrorPayload;
          return next(err);
        }

        const secret = this.configService.getOrThrow<string>('JWT_SECRET');
        const payload = await this.jwtService.verifyAsync<{ sub: string; role: string }>(token, {
          secret,
        });

        if (!payload?.sub) {
          const err = new Error(MatchSocketErrorCode.UNAUTHORIZED);
          (err as any).data = {
            code: MatchSocketErrorCode.UNAUTHORIZED,
            message: 'Invalid authentication token payload',
          } satisfies MatchSocketErrorPayload;
          return next(err);
        }

        // Attach authenticated identity exclusively derived from token to socket.data
        socket.data.user = {
          userId: payload.sub,
          role: payload.role || 'PLAYER',
        };

        return next();
      } catch {
        const err = new Error(MatchSocketErrorCode.UNAUTHORIZED);
        (err as any).data = {
          code: MatchSocketErrorCode.UNAUTHORIZED,
          message: 'Authentication token invalid or expired',
        } satisfies MatchSocketErrorPayload;
        return next(err);
      }
    });
  }

  handleConnection(client: Socket & { data: AuthenticatedSocketData }) {
    const user = client.data.user;
    if (!user || !user.userId) {
      this.emitError(client, MatchSocketErrorCode.UNAUTHORIZED, 'Unauthorized connection');
      client.disconnect(true);
      return;
    }

    const userId = user.userId;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Join room for this authenticated user
    client.join(`user:${userId}`);
  }

  handleDisconnect(client: Socket & { data: AuthenticatedSocketData }) {
    const userId = client.data.user?.userId;
    if (userId) {
      const set = this.userSockets.get(userId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) {
          this.userSockets.delete(userId);
          // When no remaining sockets exist for searching user, remove them from queue
          this.matchService.leaveMatchmaking(userId).catch(() => {});
        }
      }
    }
  }

  // Public helper methods for testing / state verification
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }

  @SubscribeMessage(MatchSocketClientEvents.JOIN_MATCHMAKING)
  async handleJoinMatchmaking(
    @ConnectedSocket() client: Socket & { data: AuthenticatedSocketData },
    @MessageBody() rawPayload: unknown,
  ) {
    if (!this.checkThrottling(client)) {
      return this.emitError(
        client,
        MatchSocketErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
      );
    }

    const validation = await this.validatePayload(JoinMatchmakingSocketDto, rawPayload, client);
    if (validation.error) return validation.error;
    const dto = validation.dto!;

    // Derived exclusively from authenticated socket identity
    const userId = client.data.user!.userId;

    try {
      const result = await this.matchService.processJoinMatchmaking(
        userId,
        dto.categoryId,
        dto.difficulty,
      );

      if (result.status === 'already_matched' || result.status === 'matched') {
        const match = result.match;
        const participantA = match.participants[0];
        const participantB = match.participants[1];

        // Ensure sockets for both users join the match room
        this.joinUserSocketsToRoom(participantA.userId, `match:${match.id}`);
        this.joinUserSocketsToRoom(participantB.userId, `match:${match.id}`);

        const sanitizedQuestions = match.questions.map((mq: any) => ({
          matchQuestionId: mq.id,
          questionId: mq.question.id,
          text: mq.question.text,
          imageKey: mq.question.imageKey ?? null,
          position: mq.position,
          options: mq.question.options.map((o: any) => ({
            id: o.id,
            text: o.text,
          })),
        }));

        const payloadA: MatchFoundS2CPayload = {
          matchId: match.id,
          opponent: {
            userId: participantB.user.id,
            username: participantB.user.username ?? null,
            displayName: participantB.user.displayName ?? null,
            avatarKey: participantB.user.avatarKey ?? null,
          },
          questions: sanitizedQuestions,
        };

        const payloadB: MatchFoundS2CPayload = {
          matchId: match.id,
          opponent: {
            userId: participantA.user.id,
            username: participantA.user.username ?? null,
            displayName: participantA.user.displayName ?? null,
            avatarKey: participantA.user.avatarKey ?? null,
          },
          questions: sanitizedQuestions,
        };

        // Notify both active user rooms
        this.server
          .to(`user:${participantA.userId}`)
          .emit(MatchSocketServerEvents.MATCH_FOUND, payloadA);
        this.server
          .to(`user:${participantB.userId}`)
          .emit(MatchSocketServerEvents.MATCH_FOUND, payloadB);

        return { status: 'matched', matchId: match.id };
      }

      // User queued
      const joinedPayload: MatchmakingJoinedS2CPayload = {
        status: 'queued',
        categoryId: dto.categoryId,
        difficulty: dto.difficulty,
      };
      client.emit(MatchSocketServerEvents.MATCHMAKING_JOINED, joinedPayload);

      return { status: 'queued', matchId: undefined };
    } catch (err: any) {
      const code = err?.response?.code || err?.code || MatchSocketErrorCode.INTERNAL_ERROR;
      const message = err?.response?.message || err?.message || 'Matchmaking error';
      return this.emitError(client, code, message);
    }
  }

  @SubscribeMessage(MatchSocketClientEvents.LEAVE_MATCHMAKING)
  async handleLeaveMatchmaking(
    @ConnectedSocket() client: Socket & { data: AuthenticatedSocketData },
  ) {
    if (!this.checkThrottling(client)) {
      return this.emitError(
        client,
        MatchSocketErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
      );
    }

    const userId = client.data.user!.userId;
    await this.matchService.leaveMatchmaking(userId);

    const leftPayload: MatchmakingLeftS2CPayload = { status: 'left' };
    client.emit(MatchSocketServerEvents.MATCHMAKING_LEFT, leftPayload);

    return leftPayload;
  }

  @SubscribeMessage(MatchSocketClientEvents.SUBMIT_ANSWER)
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket & { data: AuthenticatedSocketData },
    @MessageBody() rawPayload: unknown,
  ) {
    if (!this.checkThrottling(client)) {
      return this.emitError(
        client,
        MatchSocketErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
      );
    }

    const validation = await this.validatePayload(SubmitAnswerSocketDto, rawPayload, client);
    if (validation.error) return validation.error;
    const dto = validation.dto!;

    const userId = client.data.user!.userId;

    // Verify user is a participant in the match
    const isParticipant = await this.matchService.isParticipant(dto.matchId, userId);
    if (!isParticipant) {
      return this.emitError(
        client,
        MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        'Authenticated user is not a participant in this match',
      );
    }

    let result;
    try {
      result = await this.matchService.submitAnswer(
        dto.matchId,
        userId,
        dto.matchQuestionId,
        dto.selectedOptionId,
      );
    } catch (err: any) {
      const code =
        err.status === 400
          ? MatchSocketErrorCode.ALREADY_ANSWERED
          : MatchSocketErrorCode.INVALID_PAYLOAD;
      return this.emitError(client, code, err.message || 'Failed to submit answer');
    }

    const match = await this.prisma.match.findFirst({
      where: { id: dto.matchId },
      include: {
        questions: { include: { question: { include: { options: true } } } },
        participants: { include: { user: true } },
      },
    });

    if (!match) return result;

    const matchQuestion = match.questions.find((q) => q.id === dto.matchQuestionId);
    if (!matchQuestion) return result;

    const answers = await this.prisma.matchAnswer.findMany({
      where: { matchQuestionId: dto.matchQuestionId },
    });

    if (answers.length === 2) {
      const participantA = match.participants[0];
      const participantB = match.participants[1];

      this.server.to(`match:${dto.matchId}`).emit(MatchSocketServerEvents.ROUND_RESULT, {
        matchId: dto.matchId,
        yourScore: participantA.score,
        opponentScore: participantB.score,
        roundIndex: matchQuestion.position,
      });
    }

    const allAnsweredPromises = match.questions.map(async (q) => {
      const answerCount = await this.prisma.matchAnswer.count({
        where: { matchQuestionId: q.id },
      });
      return answerCount === 2;
    });

    const allAnswered = await Promise.all(allAnsweredPromises);
    if (allAnswered.every((v) => v)) {
      const completed = await this.matchService.completeMatch(dto.matchId);
      if (completed) {
        const participantA = completed.participants[0];
        const participantB = completed.participants[1];

        this.server.to(`match:${dto.matchId}`).emit(MatchSocketServerEvents.MATCH_END, {
          matchId: completed.id,
          winnerId: participantA.isWinner ? participantA.userId : participantB.userId,
          yourScore: participantA.score,
          opponentScore: participantB.score,
          coinsEarned: participantA.coinReward,
        });
      }
    }

    return result;
  }

  @SubscribeMessage(MatchSocketClientEvents.RECONNECT_MATCH)
  async handleReconnectMatch(
    @ConnectedSocket() client: Socket & { data: AuthenticatedSocketData },
    @MessageBody() rawPayload: unknown,
  ) {
    if (!this.checkThrottling(client)) {
      return this.emitError(
        client,
        MatchSocketErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
      );
    }

    const validation = await this.validatePayload(ReconnectMatchSocketDto, rawPayload, client);
    if (validation.error) return validation.error;
    const dto = validation.dto!;

    const userId = client.data.user!.userId;

    const isParticipant = await this.matchService.isParticipant(dto.matchId, userId);
    if (!isParticipant) {
      return this.emitError(
        client,
        MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        'Authenticated user is not a participant in this match',
      );
    }

    client.join(`match:${dto.matchId}`);

    const match = await this.prisma.match.findFirst({
      where: { id: dto.matchId },
      include: {
        participants: { include: { user: true } },
        questions: { include: { question: { include: { options: true } } } },
      },
    });

    if (!match) {
      return this.emitError(client, MatchSocketErrorCode.MATCH_NOT_FOUND, 'Match not found');
    }

    return {
      status: 'reconnected',
      matchId: match.id,
      matchStatus: match.status,
    };
  }

  @SubscribeMessage(MatchSocketClientEvents.LEAVE_MATCH)
  async handleLeaveMatch(
    @ConnectedSocket() client: Socket & { data: AuthenticatedSocketData },
    @MessageBody() rawPayload: unknown,
  ) {
    if (!this.checkThrottling(client)) {
      return this.emitError(
        client,
        MatchSocketErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
      );
    }

    const validation = await this.validatePayload(LeaveMatchSocketDto, rawPayload, client);
    if (validation.error) return validation.error;
    const dto = validation.dto!;

    const userId = client.data.user!.userId;

    const isParticipant = await this.matchService.isParticipant(dto.matchId, userId);
    if (!isParticipant) {
      return this.emitError(
        client,
        MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        'Authenticated user is not a participant in this match',
      );
    }

    client.leave(`match:${dto.matchId}`);
    return { status: 'left', matchId: dto.matchId };
  }

  private extractToken(socket: Socket): string | null {
    const authHeader =
      socket.handshake.auth?.token ||
      socket.handshake.auth?.authorization ||
      socket.handshake.headers?.authorization;

    if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
      return authHeader.replace(/^Bearer\s+/i, '').trim();
    }
    return null;
  }

  private joinUserSocketsToRoom(userId: string, room: string) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const targetSocket = this.server.sockets.sockets.get(socketId);
        targetSocket?.join(room);
      }
    }
  }

  private async validatePayload<T extends object>(
    dtoClass: new () => T,
    rawPayload: unknown,
    client: Socket,
  ): Promise<{ dto?: T; error?: { error: MatchSocketErrorPayload } }> {
    if (!rawPayload || typeof rawPayload !== 'object') {
      const error = this.emitError(
        client,
        MatchSocketErrorCode.INVALID_PAYLOAD,
        'Payload must be an object',
      );
      return { error };
    }

    const instance = plainToInstance(dtoClass, rawPayload);
    const errors = await validate(instance);

    if (errors.length > 0) {
      const error = this.emitError(
        client,
        MatchSocketErrorCode.INVALID_PAYLOAD,
        'Invalid payload parameters',
        errors.map((e) => Object.values(e.constraints || {})).flat(),
      );
      return { error };
    }

    return { dto: instance };
  }

  private checkThrottling(
    client: Socket & { data: AuthenticatedSocketData },
    maxEventsPerSec = 10,
  ): boolean {
    const now = Date.now();
    const windowMs = 1000;
    if (!client.data.eventTimestamps) {
      client.data.eventTimestamps = [];
    }
    const timestamps = client.data.eventTimestamps;
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= maxEventsPerSec) {
      return false;
    }
    timestamps.push(now);
    return true;
  }

  private emitError(
    client: Socket,
    code: MatchSocketErrorCode,
    message: string,
    details?: unknown,
  ): { error: MatchSocketErrorPayload } {
    const payload: MatchSocketErrorPayload = { code, message, details };
    client.emit(MatchSocketServerEvents.MATCHMAKING_ERROR, payload);
    client.emit(MatchSocketServerEvents.ERROR, payload);
    return { error: payload };
  }
}
