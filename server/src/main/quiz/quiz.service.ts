import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryOptions } from 'mongoose';
import { Socket } from 'socket.io';
import { parse } from 'cookie';
import { WsException } from '@nestjs/websockets';
import { AuthService } from 'src/core/auth/auth.service';
import { User } from 'src/core/user/user.schema';
import { Quiz, QuizDocument } from './schema/quiz.schema';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { Question } from 'src/admin/question/question.schema';
import { QuizResult, QuizResultDocument } from './schema/quiz-result.schema';
import { NextQuestionDto } from './dto/next-question.dto';

@Injectable()
export class QuizService {
  constructor(
    private readonly authenticationService: AuthService,
    @InjectModel(Quiz.name) private readonly model: Model<QuizDocument>,
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
  ) {}

  async createQuiz(
    body: CreateQuizDto,
    user: User,
    question: Question,
    connectionId: string,
  ) {
    const newQuizResult = {} as QuizResult;
    newQuizResult.questions = [question];
    newQuizResult.answers = [];
    const quizRes = await new this.quizResultModel(newQuizResult).save();
    const newQuiz = {} as Quiz;
    newQuiz.user = user;
    newQuiz.level = body.level;
    newQuiz.category = body.category;
    newQuiz.result = quizRes._id;
    newQuiz.connectionId = connectionId;
    return await new this.model(newQuiz).save();
  }

  async getAllMessages() {
    return this.model.find({
      relations: ['author'],
    });
  }

  async getUserFromSocket(socket: Socket) {
    const token = socket.handshake.headers.authorization;
    const user =
      await this.authenticationService.getUserFromAuthenticationToken(token);
    if (!user) {
      throw new WsException('Invalid credentials.');
    }
    return user;
  }

  public async getAll(): Promise<Quiz[]> {
    return await this.model.find().exec();
  }

  public async getById(id: string, options?: QueryOptions): Promise<Quiz> {
    return await this.model.findById(id, null, options).exec();
  }

  public checkCorrectnessOfAnswer(
    lastQuestion: Question,
    lastAnswer: string,
  ): boolean {
    const selectedOption = lastQuestion.options.find(
      (x) => x._id === lastAnswer,
    );
    return selectedOption.isAnswer;
  }

  public async updateQuizResult(
    result: QuizResult,
    lastQuestion: Question,
    lastAnswer: string,
  ): Promise<QuizResult> {
    result.answers.push({
      questionId: lastQuestion['_id'],
      answer: lastAnswer,
    });
    return result;
  }
}
