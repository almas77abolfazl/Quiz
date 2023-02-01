import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QuestionService } from 'src/admin/question/question.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { NextQuestionDto } from './dto/next-question.dto';
import { QuizService } from './quiz.service';

@WebSocketGateway()
export class QuizGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly quizService: QuizService,
    private questionService: QuestionService,
  ) {}

  async handleConnection(socket: Socket) {
    await this.quizService.getUserFromSocket(socket);
  }

  @SubscribeMessage('create_quiz')
  async listenForCreateQuiz(
    @MessageBody() body: CreateQuizDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.quizService.getUserFromSocket(socket);
    const question = await this.questionService.getQuestion(
      body.level,
      body.category,
    );
    const { _id } = await this.quizService.createQuiz(
      body,
      user,
      question,
      socket.id,
    );
    // socket.send(question);
    return { question, _id };
  }

  @SubscribeMessage('next-question')
  async listenForGetQuestion(
    @MessageBody() body: NextQuestionDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.quizService.getUserFromSocket(socket);
    const lastQuestion = await this.questionService.getById(body.lastQuestion);
    const result = await this.quizService.updateQuizResult(lastQuestion, body);
    // const question = await this.questionService.getQuestion(
    //   body.level,
    //   body.category,
    // );
    return;
  }
}
