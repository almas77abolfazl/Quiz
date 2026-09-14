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
import { MatchService } from './match.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus, AnswerStatus } from '../../types/contracts';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' },
})
export class MatchGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly matchService: MatchService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    console.log('MatchGateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_matchmaking')
  async handleJoinMatchmaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; categoryId?: string; difficulty?: string },
  ) {
    const match = await this.matchService.joinMatchmaking(
      data.userId,
      data.categoryId,
      data.difficulty as any,
    );

    if (match && match.participants.length === 2) {
      const started = await this.matchService.startMatch(match.id);
      if (!started) {
        return { status: 'queued', matchId: match.id };
      }

      const participantA = started.participants[0];
      const participantB = started.participants[1];
      const firstQuestion = started.questions[0];

      if (participantA && participantB && firstQuestion) {
        this.server.to(participantA.user.id).emit('match_found', {
          matchId: started.id,
          opponent: {
            userId: participantB.user.id,
            username: participantB.user.username,
            displayName: participantB.user.displayName,
          },
        });

        this.server.to(participantB.user.id).emit('match_found', {
          matchId: started.id,
          opponent: {
            userId: participantA.user.id,
            username: participantA.user.username,
            displayName: participantA.user.displayName,
          },
        });

        this.server.to(started.id).emit('round_start', {
          matchId: started.id,
          question: {
            id: firstQuestion.question.id,
            text: firstQuestion.question.text,
            options: firstQuestion.question.options.map((o) => ({
              id: o.id,
              text: o.text,
            })),
            position: firstQuestion.position,
            totalRounds: started.questions.length,
          },
        });
      }
    }

    return { status: 'queued', matchId: match?.id };
  }

  @SubscribeMessage('submit_answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; userId: string; matchQuestionId: string; selectedOptionId?: string },
  ) {
    const result = await this.matchService.submitAnswer(
      data.matchId,
      data.userId,
      data.matchQuestionId,
      data.selectedOptionId,
    );

    const match = await this.prisma.match.findFirst({
      where: { id: data.matchId },
      include: {
        questions: { include: { question: { include: { options: true } } } },
        participants: { include: { user: true } },
      },
    });

    if (!match) return result;

    const matchQuestion = match.questions.find((q) => q.id === data.matchQuestionId);
    if (!matchQuestion) return result;

    const answers = await this.prisma.matchAnswer.findMany({
      where: { matchQuestionId: data.matchQuestionId },
    });

    if (answers.length === 2) {
      const participantA = match.participants[0];
      const participantB = match.participants[1];

      this.server.to(data.matchId).emit('round_result', {
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
      const completed = await this.matchService.completeMatch(data.matchId);
      if (completed) {
        const participantA = completed.participants[0];
        const participantB = completed.participants[1];

        this.server.to(data.matchId).emit('match_end', {
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
}
