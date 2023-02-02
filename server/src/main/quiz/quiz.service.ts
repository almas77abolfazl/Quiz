import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    const quizRes = await new this.model(newQuizResult).save();
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
    const cookie = socket.handshake.headers.cookie;
    const { Authentication: authenticationToken } = parse(cookie);
    const user =
      await this.authenticationService.getUserFromAuthenticationToken(
        authenticationToken,
      );
    if (!user) {
      throw new WsException('Invalid credentials.');
    }
    return user;
  }

  public async getAll(): Promise<Quiz[]> {
    return await this.model.find().exec();
  }

  public async updateQuizResult(
    lastQuestion: Question,
    nextQuestionDto: NextQuestionDto,
  ) {
    const { quizId, lastAnswer } = nextQuestionDto;
    const { result } = await this.model.findById(quizId, null, {
      populate: 'result',
    });
    (result as QuizResult).answers.push({
      questionId: lastQuestion['_id'],
      answer: lastAnswer,
    });

    return result as QuizResult;
  }
}
