import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { catchError, map, Observable, of } from 'rxjs';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionRepository } from './question.repository';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private service: QuestionService) {}

  @Post()
  async createQuestion(
    @Body() body: CreateQuestionDto,
  ): Promise<{ updated?: boolean; created?: boolean; message: string }> {
    return await this.service.create(body);
  }

  @Put(':id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() body: UpdateQuestionDto,
  ) {
    return this.service.update(id, body.questionText);
  }

  @Get()
  async getAllCategories(): Promise<QuestionRepository[]> {
    return await this.service.getAll();
  }

  @Get(':id')
  async getQuestionById(@Param('id') id: string): Promise<QuestionRepository> {
    return await this.service.getById(id);
  }

  @Delete(':id')
  async deleteQuestionById(@Param('id') id: string) {
    return await this.service.deleteById(id);
  }
}
