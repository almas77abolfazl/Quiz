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
  MatchCountdownS2CPayload,
  MatchmakingJoinedS2CPayload,
  MatchmakingLeftS2CPayload,
  MatchRoundStartS2CPayload,
  MatchRoundResultS2CPayload,
  MatchEndS2CPayload,
  MatchStatus,
  OpponentConnectionChangedS2CPayload,
  OpponentAnsweredS2CPayload,
} from '@quiz/contracts';
import { MatchService, MatchLifecycleEventListener } from './match.service';
import { MatchPresenceService } from './match-presence.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  JoinMatchmakingSocketDto,
  PlayerReadySocketDto,
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
export class MatchGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, MatchLifecycleEventListener
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly matchService: MatchService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: MatchPresenceService,
  ) {}

  afterInit(server: Server) {
    this.matchService.registerEventListener(this);
    if (typeof this.matchService.recoverActiveMatches === 'function') {
      this.matchService.recoverActiveMatches().catch((err) => {
        console.error('[MatchGateway] Failed to recover active matches during startup:', err);
      });
    }

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

  // Implementation of MatchLifecycleEventListener callbacks
  onMatchCountdown(payload: MatchCountdownS2CPayload): void {
    this.server
      .to(`match:${payload.matchId}`)
      .emit(MatchSocketServerEvents.MATCH_COUNTDOWN, payload);
  }

  onRoundStart(payload: MatchRoundStartS2CPayload): void {
    this.server.to(`match:${payload.matchId}`).emit(MatchSocketServerEvents.ROUND_START, payload);
  }

  onRoundResult(
    matchId: string,
    payloads: Array<{ userId: string; payload: MatchRoundResultS2CPayload }>,
  ): void {
    for (const item of payloads) {
      this.server
        .to(`user:${item.userId}`)
        .emit(MatchSocketServerEvents.ROUND_RESULT, item.payload);
    }
  }

  onMatchEnd(payloads: Array<{ userId: string; payload: MatchEndS2CPayload }>): void {
    for (const item of payloads) {
      this.server.to(`user:${item.userId}`).emit(MatchSocketServerEvents.MATCH_END, item.payload);
    }
  }

  handleConnection(client: Socket & { data: AuthenticatedSocketData }) {
    const user = client.data.user;
    if (!user || !user.userId) {
      this.emitError(client, MatchSocketErrorCode.UNAUTHORIZED, 'Unauthorized connection');
      client.disconnect(true);
      return;
    }

    const userId = user.userId;
    const { isFirstSocket } = this.presenceService.addSocket(userId, client.id);

    client.join(`user:${userId}`);

    if (isFirstSocket) {
      this.notifyOpponentsPresenceChange(userId, true).catch(() => {});
    }
  }

  handleDisconnect(client: Socket & { data: AuthenticatedSocketData }) {
    const userId = client.data.user?.userId;
    if (userId) {
      const { isLastSocket } = this.presenceService.removeSocket(userId, client.id);

      if (isLastSocket) {
        this.matchService.leaveMatchmaking(userId).catch(() => {});
        this.notifyOpponentsPresenceChange(userId, false).catch(() => {});
      }
    }
  }

  getUserSocketCount(userId: string): number {
    return this.presenceService.getUserSocketCount(userId);
  }

  private async notifyOpponentsPresenceChange(userId: string, isOnline: boolean): Promise<void> {
    const matches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.WAITING, MatchStatus.ACTIVE] },
        participants: { some: { userId } },
      },
      include: {
        participants: { select: { userId: true } },
      },
    });

    for (const match of matches) {
      const opponent = match.participants.find((p) => p.userId !== userId);
      if (opponent) {
        const payload: OpponentConnectionChangedS2CPayload = {
          matchId: match.id,
          userId,
          isOnline,
        };
        this.server
          .to(`user:${opponent.userId}`)
          .emit(MatchSocketServerEvents.OPPONENT_CONNECTION_CHANGED, payload);
      }
    }
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

        this.joinUserSocketsToRoom(participantA.userId, `match:${match.id}`);
        this.joinUserSocketsToRoom(participantB.userId, `match:${match.id}`);

        let categoryTitle: string | null = null;
        if (match.categoryId) {
          const cat = await this.prisma.category.findUnique({ where: { id: match.categoryId } });
          categoryTitle = cat?.title ?? null;
        }

        const payloadA: MatchFoundS2CPayload = {
          matchId: match.id,
          opponent: {
            userId: participantB.user.id,
            username: participantB.user.username ?? null,
            displayName: participantB.user.displayName ?? null,
            avatarKey: participantB.user.avatarKey ?? null,
          },
          totalRounds: 5,
          categoryId: match.categoryId ?? null,
          categoryTitle,
          difficulty: match.difficulty ?? null,
        };

        const payloadB: MatchFoundS2CPayload = {
          matchId: match.id,
          opponent: {
            userId: participantA.user.id,
            username: participantA.user.username ?? null,
            displayName: participantA.user.displayName ?? null,
            avatarKey: participantA.user.avatarKey ?? null,
          },
          totalRounds: 5,
          categoryId: match.categoryId ?? null,
          categoryTitle,
          difficulty: match.difficulty ?? null,
        };

        this.server
          .to(`user:${participantA.userId}`)
          .emit(MatchSocketServerEvents.MATCH_FOUND, payloadA);
        this.server
          .to(`user:${participantB.userId}`)
          .emit(MatchSocketServerEvents.MATCH_FOUND, payloadB);

        return { status: 'matched', matchId: match.id };
      }

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

  @SubscribeMessage(MatchSocketClientEvents.PLAYER_READY)
  async handlePlayerReady(
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

    const validation = await this.validatePayload(PlayerReadySocketDto, rawPayload, client);
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
    this.joinUserSocketsToRoom(userId, `match:${dto.matchId}`);

    await this.matchService.setPlayerReady(dto.matchId, userId);

    return { status: 'ready', matchId: dto.matchId };
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

    const isParticipant = await this.matchService.isParticipant(dto.matchId, userId);
    if (!isParticipant) {
      return this.emitError(
        client,
        MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT,
        'Authenticated user is not a participant in this match',
      );
    }

    try {
      const result = await this.matchService.submitAnswer(
        dto.matchId,
        userId,
        dto.matchQuestionId,
        dto.selectedOptionId,
      );

      const match = await this.prisma.match.findUnique({
        where: { id: dto.matchId },
        select: { participants: { select: { userId: true } } },
      });
      const opponent = match?.participants.find((p) => p.userId !== userId);
      if (opponent) {
        const opponentPayload: OpponentAnsweredS2CPayload = { matchId: dto.matchId };
        this.server
          .to(`user:${opponent.userId}`)
          .emit(MatchSocketServerEvents.OPPONENT_ANSWERED, opponentPayload);
      }

      return result;
    } catch (err: any) {
      const code = err?.response?.code || MatchSocketErrorCode.INVALID_PAYLOAD;
      const message = err?.response?.message || err?.message || 'Failed to submit answer';
      return this.emitError(client, code, message);
    }
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

    try {
      const snapshot = await this.matchService.getReconnectSnapshot(dto.matchId, userId);

      client.join(`match:${dto.matchId}`);
      this.joinUserSocketsToRoom(userId, `match:${dto.matchId}`);

      client.emit(MatchSocketServerEvents.MATCH_RECONNECTED, snapshot);
      return snapshot;
    } catch (err: any) {
      const code = err?.response?.code || err?.code || MatchSocketErrorCode.INTERNAL_ERROR;
      const message = err?.response?.message || err?.message || 'Failed to reconnect match';
      return this.emitError(client, code, message);
    }
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
    const socketIds = this.presenceService.getUserSockets(userId);
    for (const socketId of socketIds) {
      const targetSocket = this.server.sockets.sockets.get(socketId);
      targetSocket?.join(room);
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
