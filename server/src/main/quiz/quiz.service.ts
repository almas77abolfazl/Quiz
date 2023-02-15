import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryOptions } from 'mongoose';
import { Socket } from 'socket.io';
import { AuthService } from 'src/core/auth/auth.service';
import { User } from 'src/core/user/user.schema';
import { Quiz, QuizDocument } from './schema/quiz.schema';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { Question } from 'src/admin/question/question.schema';
import { QuizResult, QuizResultDocument } from './schema/quiz-result.schema';
import { NextQuestionDto } from './dto/next-question.dto';
import { QuestionService } from 'src/admin/question/question.service';

@Injectable()
export class QuizService {
  constructor(
    private readonly authenticationService: AuthService,
    @InjectModel(Quiz.name) private readonly model: Model<QuizDocument>,
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
    private questionService: QuestionService,
  ) {}

  async createQuiz(body: CreateQuizDto, user: User, connectionId: string) {
    const newQuizResult = {} as QuizResult;
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
      await this.authenticationService.getUserFromAuthenticationToken(
        token,
        true,
      );
    return user;
  }

  public async getAll(): Promise<Quiz[]> {
    return await this.model.find().exec();
  }

  public async getById(id: string, options?: QueryOptions): Promise<Quiz> {
    return await this.model.findById(id, null, options).lean().exec();
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
    lastQuestionId: string,
    answerWasCorrect: boolean,
  ): Promise<QuizResult> {
    result.answers.push({
      questionId: lastQuestionId,
      answerWasCorrect,
    });
    await this.quizResultModel.findByIdAndUpdate(result['_id'], result).exec();
    return result;
  }

  public async getQuizResult(quizId: string): Promise<any> {
    const { result } = await this.model
      .findById(quizId)
      .populate('result')
      .lean();
    const questionIds = (result as QuizResult).answers.map((x) => x.questionId);
    const questions = await this.questionService.getByIds(questionIds);
    const res: { answerWasCorrect?: boolean; question: Question }[] = [];
    (result as QuizResult).answers.forEach((answer) => {
      const question = questions.find((q) =>
        answer.questionId['equals'](q['_id']),
      );
      question.options.forEach((option) => {
        delete option.isAnswer;
      });
      res.push({
        answerWasCorrect: answer.answerWasCorrect,
        question,
      });
    });
    return {
      result: res,
      score: res
        .map((x) => Number(x.answerWasCorrect))
        .reduce((x, y) => {
          return x + y;
        }),
    };
  }
}
