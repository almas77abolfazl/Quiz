import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionRepository } from './question.repository';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(QuestionRepository)
    public readonly repository: MongoRepository<QuestionRepository>,
  ) {}

  public async create(
    body: CreateQuestionDto,
  ): Promise<{ created: boolean; message: string }> {
    const newQuestion = new QuestionRepository();
    newQuestion.questionText = body.questionText;
    newQuestion.category = body.category;
    newQuestion.level = body.level;
    newQuestion.options = body.options;
    await this.repository.save([newQuestion]);
    return { created: true, message: 'messages.savedSuccessfully' };
  }

  public async update(
    id: string,
    questionText: string,
  ): Promise<{ updated: boolean; message: string }> {
    const question = await this.getById(id);
    if (!question) {
      throw new HttpException(
        'This Question does not exist',
        HttpStatus.NOT_FOUND,
      );
    } else {
      question.questionText = questionText;
      await this.repository.save([question]);
      return { updated: true, message: 'messages.savedSuccessfully' };
    }
  }

  public async getAll(): Promise<QuestionRepository[]> {
    return await this.repository.find({});
  }

  public async getById(id?: string): Promise<QuestionRepository> {
    const question = await this.repository.findOneById(id);
    return question;
  }

  public async deleteById(id?: string) {
    return await this.repository.delete(id);
  }

  private async getByTitle(questionText: string): Promise<QuestionRepository> {
    const question = await this.repository.findOne({
      where: { questionText },
    });
    return question;
  }
}
