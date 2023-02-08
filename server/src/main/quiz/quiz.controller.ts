import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { Quiz } from './schema/quiz.schema';

@Controller('quiz')
export class QuizController {
  constructor(private service: QuizService) {}

  @Get()
  async getAllQuizzes(): Promise<Quiz[]> {
    //TODO
    return await this.service.getAll();
  }
}
