import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';
import { Difficulty, QuestionStatus, UserRole } from '@quiz/contracts';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetQuestionsQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.categoryId) {
      where.categories = {
        some: { categoryId: query.categoryId },
      };
    }

    const trimmedSearch = query.search?.trim();
    if (trimmedSearch) {
      where.text = {
        contains: trimmedSearch,
        mode: 'insensitive',
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          options: { orderBy: { sortOrder: 'asc' } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasPreviousPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage,
        hasNextPage,
      },
    };
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

  async update(id: string, dto: UpdateQuestionDto, actorRole?: string) {
    const existing = await this.prisma.question.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Question not found');

    if (dto.status === QuestionStatus.PUBLISHED && actorRole !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Only Root Admin can publish questions');
    }

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

  async publish(id: string, reviewerId: string, actorRole?: string) {
    if (actorRole && actorRole !== UserRole.ROOT_ADMIN) {
      throw new ForbiddenException('Only Root Admin can publish questions');
    }

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
