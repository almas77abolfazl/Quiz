import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverKey: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        coverKey: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        title: dto.title,
        description: dto.description,
        coverKey: dto.coverKey,
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverKey: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Category not found');

    return this.prisma.category.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        title: true,
        description: true,
        coverKey: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Category not found');

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
