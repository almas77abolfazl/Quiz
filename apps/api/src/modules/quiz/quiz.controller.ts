import {
  Controller,
  Post,
  Param,
  Body,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthenticatedRequest } from '../auth/access-token.guard';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('start')
  @UseGuards(AccessTokenGuard)
  start(@Body() dto: StartQuizDto, @Req() request: AuthenticatedRequest) {
    return this.quizService.startQuiz(request.user.userId, dto);
  }

  @Post(':id/answer')
  @UseGuards(AccessTokenGuard)
  submitAnswer(
    @Param('id') quizSessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.quizService.submitAnswer(request.user.userId, quizSessionId, dto);
  }

  @Post(':id/finish')
  @UseGuards(AccessTokenGuard)
  finish(@Param('id') quizSessionId: string, @Req() request: AuthenticatedRequest) {
    return this.quizService.finishQuiz(request.user.userId, quizSessionId);
  }

  @Post(':id/advance')
  @UseGuards(AccessTokenGuard)
  advance(@Param('id') quizSessionId: string, @Req() request: AuthenticatedRequest) {
    return this.quizService.advanceQuiz(request.user.userId, quizSessionId);
  }

  @Get('history')
  @UseGuards(AccessTokenGuard)
  history(@Req() request: AuthenticatedRequest) {
    return this.quizService.getQuizHistory(request.user.userId);
  }
}
