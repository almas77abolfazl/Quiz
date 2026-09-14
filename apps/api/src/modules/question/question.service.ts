import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Difficulty, QuestionStatus } from '../../types/contracts';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(categoryId?: string, difficulty?: Difficulty) {
    const where: any = { deletedAt: null, status: QuestionStatus.PUBLISHED };
    if (categoryId) {
      where.categories = { some: { categoryId } };
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    return this.prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async create(dto: CreateQuestionDto, userId: string) {
    const question = await this.prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          text: dto.text,
          explanation: dto.explanation,
          imageKey: dto.imageKey,
          difficulty: dto.difficulty,
          status: QuestionStatus.DRAFT,
          authoredById: userId,
          options: {
            create: dto.questionOptions.map((opt) => ({
              text: opt.text,
              sortOrder: opt.sortOrder,
              isCorrect: opt.isCorrect,
            })),
          },
          categories: {
            create: (dto.categoryIds ?? []).map((categoryId) => ({
              categoryId,
            })),
          },
          tags: {
            create: (dto.tagIds ?? []).map((tagId) => ({
              tagId,
            })),
          },
        },
        include: {
          options: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      });
      return created;
    });
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Question not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.text !== undefined) data.text = dto.text;
      if (dto.explanation !== undefined) data.explanation = dto.explanation;
      if (dto.imageKey !== undefined) data.imageKey = dto.imageKey;
      if (dto.difficulty !== undefined) data.difficulty = dto.difficulty;
      if (dto.status !== undefined) data.status = dto.status;

      if (dto.categoryIds) {
        await tx.questionCategory.deleteMany({ where: { questionId: id } });
        data.categories = {
          create: dto.categoryIds.map((categoryId) => ({ categoryId })),
        };
      }

      if (dto.tagIds) {
        await tx.questionTag.deleteMany({ where: { questionId: id } });
        data.tags = { create: dto.tagIds.map((tagId) => ({ tagId })) };
      }

      return tx.question.update({
        where: { id },
        data,
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      });
    });

    return updated;
  }

  async publish(id: string, reviewerId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });
    if (!question) throw new NotFoundException('Question not found');

    return this.prisma.question.update({
      where: { id },
      data: {
        status: QuestionStatus.PUBLISHED,
        reviewedById: reviewerId,
        publishedAt: new Date(),
      },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Question not found');

    await this.prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
