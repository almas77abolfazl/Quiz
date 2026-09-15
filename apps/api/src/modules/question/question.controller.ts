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
import { UserRole, Difficulty, AdminQuestionDto } from '@quiz/contracts';
import { AuthenticatedRequest } from '../auth/access-token.guard';
import { mapToAdminQuestionDto } from './question.mapper';

@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: Difficulty,
  ): Promise<AdminQuestionDto[]> {
    const questions = await this.questionService.findAll(categoryId, difficulty);
    return questions.map(mapToAdminQuestionDto);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  async findOne(@Param('id') id: string): Promise<AdminQuestionDto> {
    const question = await this.questionService.findOne(id);
    return mapToAdminQuestionDto(question);
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  async create(
    @Body() dto: CreateQuestionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminQuestionDto> {
    const created = await this.questionService.create(dto, request.user.userId);
    return mapToAdminQuestionDto(created);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminQuestionDto> {
    const updated = await this.questionService.update(id, dto, request.user.role);
    return mapToAdminQuestionDto(updated);
  }

  @Put(':id/publish')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN)
  async publish(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AdminQuestionDto> {
    const published = await this.questionService.publish(id, request.user.userId, request.user.role);
    return mapToAdminQuestionDto(published);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  remove(@Param('id') id: string) {
    return this.questionService.remove(id);
  }
}
