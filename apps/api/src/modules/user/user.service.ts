import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        username: true,
        displayName: true,
        avatarKey: true,
        role: true,
        coins: true,
        dailyStreak: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const data: any = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
    }

    if (dto.username !== undefined) {
      const existing = await this.prisma.user.findFirst({
        where: { username: dto.username, deletedAt: null },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username is already taken');
      }

      const lastHistory = await this.prisma.usernameHistory.findFirst({
        where: { userId },
        orderBy: { changedAt: 'desc' },
      });

      if (user.username && user.username !== dto.username) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (lastHistory && lastHistory.changedAt > thirtyDaysAgo) {
          throw new BadRequestException('Username can only be changed every 30 days');
        }
      }

      data.username = dto.username;
      await this.prisma.usernameHistory.create({
        data: { userId, username: dto.username },
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        username: true,
        displayName: true,
        avatarKey: true,
        role: true,
        coins: true,
        dailyStreak: true,
        createdAt: true,
      },
    });
  }

  async followCategory(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Category not found');

    const existing = await this.prisma.categoryFollow.findFirst({
      where: { userId, categoryId },
    });

    if (!existing) {
      await this.prisma.categoryFollow.create({
        data: { userId, categoryId },
      });
    }

    return { success: true };
  }

  async unfollowCategory(userId: string, categoryId: string) {
    await this.prisma.categoryFollow.deleteMany({
      where: { userId, categoryId },
    });
    return { success: true };
  }

  async getFollowedCategories(userId: string) {
    const follows = await this.prisma.categoryFollow.findMany({
      where: { userId },
      include: { category: true },
    });
    return follows.map((f) => f.category);
  }
}
