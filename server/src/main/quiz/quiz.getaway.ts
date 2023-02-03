import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { QuestionService } from 'src/admin/question/question.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { NextQuestionDto } from './dto/next-question.dto';
import { QuizService } from './quiz.service';
import { QuizResult } from './schema/quiz-result.schema';

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
    question.options.forEach((o) => {
      delete o.isAnswer;
    });
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
    const { lastAnswer, lastQuestionId, quizId } = body;
    const lastQuestion = await this.questionService.getById(lastQuestionId);
    const currentQuiz = await this.quizService.getById(quizId, {
      populate: 'result',
    });
    await this.quizService.updateQuizResult(
      currentQuiz.result as QuizResult,
      lastQuestion,
      lastAnswer,
    );
    const answerWasCorrect = this.quizService.checkCorrectnessOfAnswer(
      lastQuestion,
      lastAnswer,
    );
    const question = await this.questionService.getQuestion(
      currentQuiz.level,
      currentQuiz.category as Types.ObjectId,
      (currentQuiz.result as QuizResult).questions.map((x) => x['_id']),
    );
    return { answerWasCorrect, question };
  }
}
