import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, Difficulty } from '@quiz/contracts';
import { AuthenticatedRequest } from '../auth/access-token.guard';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: Difficulty,
  ) {
    return this.questionService.findAll(categoryId, difficulty);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  create(@Body() dto: CreateQuestionDto, @Req() request: AuthenticatedRequest) {
    return this.questionService.create(dto, request.user.userId);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(id, dto);
  }

  @Put(':id/publish')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  publish(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.questionService.publish(id, request.user.userId);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  remove(@Param('id') id: string) {
    return this.questionService.remove(id);
  }
}
