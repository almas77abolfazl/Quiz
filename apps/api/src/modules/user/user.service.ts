import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  QuizService,
  getProductDateKey,
  getCoinsForDifficulty,
  getSeasonPointsForDifficulty,
} from '../quiz/quiz.service';
import {
  PlayerHomeSummaryDto,
  PlayerHomeSummarySeasonDto,
  PlayerHomeSummaryCategoryDto,
  PlayerHomeRecentGameDto,
  PlayerProfileDto,
  PlayerProfileBadgeDto,
  PlayerProfileFavoriteCategoryDto,
  Difficulty,
  AnswerStatus,
  GameStatus,
} from '@quiz/contracts';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly quizService?: QuizService,
  ) {}

  async getHomeSummary(userId: string): Promise<PlayerHomeSummaryDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        username: true,
        displayName: true,
        avatarKey: true,
        coins: true,
        dailyStreak: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Active Season
    const activeSeason = await this.prisma.season.findFirst({
      where: { isActive: true },
    });

    let seasonDto: PlayerHomeSummarySeasonDto | null = null;
    if (activeSeason) {
      const entry = await this.prisma.seasonEntry.findFirst({
        where: { seasonId: activeSeason.id, userId },
      });

      let rank: number | null = null;
      if (entry) {
        const higherCount = await this.prisma.seasonEntry.count({
          where: {
            seasonId: activeSeason.id,
            score: { gt: entry.score },
          },
        });
        rank = higherCount + 1;
      }

      seasonDto = {
        seasonId: activeSeason.id,
        jalaliYear: activeSeason.jalaliYear,
        jalaliMonth: activeSeason.jalaliMonth,
        score: entry ? entry.score : 0,
        rank,
      };
    }

    // 2. Daily Quota
    const limit = this.quizService ? this.quizService.getDailyRankedGameLimit() : 15;
    const dateKey = getProductDateKey();
    const usage = await this.prisma.dailyUsage.findUnique({
      where: { userId_dateKey: { userId, dateKey } },
    });
    const used = usage?.soloRankedCount ?? 0;
    const remaining = Math.max(0, limit - used);

    // 3. Active Categories
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverKey: true,
        _count: {
          select: {
            questions: {
              where: {
                question: {
                  status: 'PUBLISHED',
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
    });

    const categoryDtos: PlayerHomeSummaryCategoryDto[] = categories.map((cat) => ({
      id: cat.id,
      title: cat.title,
      description: cat.description,
      coverKey: cat.coverKey,
      questionCount: cat._count.questions,
    }));

    // 4. Recent Completed Solo Games
    const recentSessions = await this.prisma.quizSession.findMany({
      where: { userId, status: GameStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        questions: {
          include: {
            question: {
              select: { id: true, difficulty: true },
            },
          },
        },
      },
    });

    const categoryIds = Array.from(
      new Set(recentSessions.map((s) => s.categoryId).filter((id): id is string => !!id)),
    );

    const catList =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, title: true },
          })
        : [];
    const catMap = new Map(catList.map((c) => [c.id, c.title]));

    const recentSoloGames: PlayerHomeRecentGameDto[] = recentSessions.map((session) => {
      let correctAnswers = 0;
      let coinsFromAnswers = 0;
      let seasonPointsFromAnswers = 0;

      for (const q of session.questions) {
        if (q.status === AnswerStatus.CORRECT) {
          correctAnswers++;
          const diff = q.question.difficulty as Difficulty;
          coinsFromAnswers += getCoinsForDifficulty(diff);
          seasonPointsFromAnswers += getSeasonPointsForDifficulty(diff);
        }
      }

      const earnedCoins = coinsFromAnswers + 2;
      const earnedSeasonPoints = session.isRanked ? seasonPointsFromAnswers : 0;
      const completedAt = (session.completedAt ?? session.startedAt).toISOString();

      return {
        id: session.id,
        categoryId: session.categoryId,
        categoryTitle: session.categoryId ? (catMap.get(session.categoryId) ?? null) : null,
        difficulty: session.difficulty as Difficulty | null,
        correctAnswers,
        totalQuestions: session.questions.length,
        earnedCoins,
        earnedSeasonPoints,
        completedAt,
      };
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        avatarKey: user.avatarKey,
        coins: user.coins,
        dailyStreak: user.dailyStreak,
      },
      season: seasonDto,
      dailyQuota: {
        used,
        limit,
        remaining,
      },
      categories: categoryDtos,
      recentSoloGames,
    };
  }

  async getProfileDetails(userId: string): Promise<PlayerProfileDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        username: true,
        displayName: true,
        avatarKey: true,
        coins: true,
        dailyStreak: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const maskedPhone = user.phone ? this.maskPhone(user.phone) : '';

    const activeSeason = await this.prisma.season.findFirst({
      where: { isActive: true },
    });

    let seasonScore = 0;
    let seasonRank: number | null = null;

    if (activeSeason) {
      const entry = await this.prisma.seasonEntry.findFirst({
        where: { seasonId: activeSeason.id, userId },
      });
      if (entry) {
        seasonScore = entry.score;
        const higherCount = await this.prisma.seasonEntry.count({
          where: {
            seasonId: activeSeason.id,
            score: { gt: entry.score },
          },
        });
        seasonRank = higherCount + 1;
      }
    }

    const totalCompletedSoloGames = await this.prisma.quizSession.count({
      where: { userId, status: GameStatus.COMPLETED },
    });

    const [totalCorrectAnswers, totalIncorrectAnswers, totalTimedOutAnswers] = await Promise.all([
      this.prisma.quizSessionQuestion.count({
        where: { quizSession: { userId }, status: AnswerStatus.CORRECT },
      }),
      this.prisma.quizSessionQuestion.count({
        where: { quizSession: { userId }, status: AnswerStatus.INCORRECT },
      }),
      this.prisma.quizSessionQuestion.count({
        where: { quizSession: { userId }, status: AnswerStatus.TIMED_OUT },
      }),
    ]);

    const totalAnswers = totalCorrectAnswers + totalIncorrectAnswers + totalTimedOutAnswers;
    const answerAccuracy =
      totalAnswers > 0 ? Math.round((totalCorrectAnswers / totalAnswers) * 100 * 10) / 10 : 0;

    const recentSessions = await this.prisma.quizSession.findMany({
      where: { userId, status: GameStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        questions: {
          include: {
            question: {
              select: { id: true, difficulty: true },
            },
          },
        },
      },
    });

    const categoryIds = Array.from(
      new Set(recentSessions.map((s) => s.categoryId).filter((id): id is string => !!id)),
    );

    const catList =
      categoryIds.length > 0
        ? await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, title: true },
          })
        : [];
    const catMap = new Map(catList.map((c) => [c.id, c.title]));

    const recentSoloGames: PlayerHomeRecentGameDto[] = recentSessions.map((session) => {
      let correctAnswers = 0;
      let coinsFromAnswers = 0;
      let seasonPointsFromAnswers = 0;

      for (const q of session.questions) {
        if (q.status === AnswerStatus.CORRECT) {
          correctAnswers++;
          const diff = q.question.difficulty as Difficulty;
          coinsFromAnswers += getCoinsForDifficulty(diff);
          seasonPointsFromAnswers += getSeasonPointsForDifficulty(diff);
        }
      }

      const earnedCoins = coinsFromAnswers + 2;
      const earnedSeasonPoints = session.isRanked ? seasonPointsFromAnswers : 0;
      const completedAt = (session.completedAt ?? session.startedAt).toISOString();

      return {
        id: session.id,
        categoryId: session.categoryId,
        categoryTitle: session.categoryId ? (catMap.get(session.categoryId) ?? null) : null,
        difficulty: session.difficulty as Difficulty | null,
        correctAnswers,
        totalQuestions: session.questions.length,
        earnedCoins,
        earnedSeasonPoints,
        completedAt,
      };
    });

    const follows = await this.prisma.categoryFollow.findMany({
      where: { userId, category: { deletedAt: null } },
      include: { category: true },
    });

    const favoriteCategories: PlayerProfileFavoriteCategoryDto[] = follows.map((f) => ({
      id: f.category.id,
      title: f.category.title,
      coverKey: f.category.coverKey,
    }));

    const earnedBadges: PlayerProfileBadgeDto[] = [];

    return {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarKey: user.avatarKey,
      maskedPhone,
      coins: user.coins,
      dailyStreak: user.dailyStreak,
      seasonScore,
      seasonRank,
      stats: {
        totalCompletedSoloGames,
        totalCorrectAnswers,
        totalIncorrectAnswers,
        totalTimedOutAnswers,
        answerAccuracy,
      },
      recentSoloGames,
      favoriteCategories,
      earnedBadges,
    };
  }

  private maskPhone(phone: string): string {
    if (!phone) return '';
    if (phone.length <= 6) return phone;
    return phone.slice(0, 4) + '***' + phone.slice(-4);
  }

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
