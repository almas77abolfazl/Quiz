import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question } from './question.schema';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private service: QuestionService) {}

  @Post()
  async createQuestion(
    @Body() body: CreateQuestionDto,
  ): Promise<{ created: boolean; message: string }> {
    return await this.service.create(body);
  }

  @Put(':id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() body: UpdateQuestionDto,
  ): Promise<{ updated: boolean; message: string }> {
    return this.service.update(id, body);
  }

  @Get()
  async getAllQuestions(): Promise<Question[]> {
    return await this.service.getAll();
  }

  @Get(':id')
  async getQuestionById(@Param('id') id: string): Promise<Question> {
    return await this.service.getById(id);
  }

  @Delete(':id')
  async deleteQuestionById(@Param('id') id: string): Promise<Question> {
    return await this.service.deleteById(id);
  }
}
