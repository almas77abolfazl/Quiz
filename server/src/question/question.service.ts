import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose/dist';
import { Model } from 'mongoose';

import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question, QuestionDocument } from './question.schema';

@Injectable()
export class QuestionService {
  constructor(
    @InjectModel(Question.name) private readonly model: Model<QuestionDocument>,
  ) {}

  public async create(
    body: CreateQuestionDto,
  ): Promise<{ created: boolean; message: string }> {
    const newQuestion = {} as Question;
    newQuestion.questionText = body.questionText;
    newQuestion.category = body.category;
    newQuestion.level = body.level;
    newQuestion.options = body.options;
    await new this.model({
      ...newQuestion,
      createdAt: new Date(),
    }).save();
    return { created: true, message: 'messages.savedSuccessfully' };
  }

  public async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<{ updated: boolean; message: string }> {
    const question = await this.getById(id);
    if (!question) {
      throw new HttpException(
        'This Question does not exist',
        HttpStatus.NOT_FOUND,
      );
    } else {
      Object.assign(question, updateQuestionDto);
      await this.model.findByIdAndUpdate(id, question).exec();
      return { updated: true, message: 'messages.savedSuccessfully' };
    }
  }

  public async getAll(): Promise<Question[]> {
    return await this.model.find().populate('category').exec();
  }

  public async getById(id?: string): Promise<Question> {
    return await this.model.findById(id).exec();
  }

  public async deleteById(id?: string): Promise<Question> {
    return await this.model.findByIdAndDelete(id).exec();
  }

  private async getByTitle(questionText: string): Promise<Question> {
    return await this.model.findOne({ questionText });
  }
}
