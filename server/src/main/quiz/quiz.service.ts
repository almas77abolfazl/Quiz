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
    const cookie = socket.handshake.headers['x-access-token'] || 'hhh';
    const { Authentication: authenticationToken } = parse(cookie as string);
    const user =
      await this.authenticationService.getUserFromAuthenticationToken(
        authenticationToken ??
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2M2QyYTE2MzUyMzUzYzQxYjg1NmNiMTMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJkZWZhdWx0QGVtYWlsLmNvbSIsInJvbGUiOiJzYSIsImNyZWF0ZWRBdCI6IjIwMjMtMDEtMjZUMTU6NTA6NTkuNzcwWiIsInVwZGF0ZWRBdCI6IjIwMjMtMDItMDZUMTc6NDM6NDEuMTA1WiIsImFkZHJlc3MiOiLYtNmH2LHYs9iq2KfZhiDYqNmH2KfYsdiz2KrYp9mG2Iwg2LTZh9ixINqv2YTYs9iq2KfZhtiMINiu24zYp9io2KfZhiDZgtio2KfYr9uM2Iwg2qnZiNqG2Ycg2KjZhtmB2LTZhyA02Iwg2b7ZhNin2qkgNDTYjCDZiNin2K3YryAyINuM2KcgMSIsImZpcnN0TmFtZSI6Itin2KjZiNin2YTZgdi22YQiLCJnZW5kZXIiOiJtYWxlIiwibGFzdE5hbWUiOiLZhti124zYsduMINin2YTZhdin2LMiLCJpYXQiOjE2NzU3MDc0ODcsImV4cCI6MTY3NTcwODM4N30.JupDeTYIaXSVcueAf_EVMY9olkZisE0CaXe5DYp37DQ',
      );
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
