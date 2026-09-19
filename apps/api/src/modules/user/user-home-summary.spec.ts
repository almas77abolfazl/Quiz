import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuizService } from '../quiz/quiz.service';
import { NotFoundException } from '@nestjs/common';
import { GameStatus, AnswerStatus, Difficulty } from '@quiz/contracts';

describe('UserService - getHomeSummary', () => {
  let service: UserService;
  let prisma: any;
  let quizService: any;

  const mockUser = {
    id: 'user-123',
    phone: '09123456789',
    username: 'testplayer',
    displayName: 'Test Player',
    avatarKey: 'avatar-1',
    coins: 250,
    dailyStreak: 3,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
      season: {
        findFirst: jest.fn(),
      },
      seasonEntry: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      dailyUsage: {
        findUnique: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      quizSession: {
        findMany: jest.fn(),
      },
    };

    quizService = {
      getDailyRankedGameLimit: jest.fn().mockReturnValue(15),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuizService, useValue: quizService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should throw NotFoundException if user does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.getHomeSummary('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should return empty/null states when no active season or history exists', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.season.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.findUnique.mockResolvedValue(null);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.quizSession.findMany.mockResolvedValue([]);

    const result = await service.getHomeSummary('user-123');

    expect(result.user).toEqual({
      id: mockUser.id,
      phone: mockUser.phone,
      username: mockUser.username,
      displayName: mockUser.displayName,
      avatarKey: mockUser.avatarKey,
      coins: mockUser.coins,
      dailyStreak: mockUser.dailyStreak,
    });
    expect(result.season).toBeNull();
    expect(result.dailyQuota).toEqual({ used: 0, limit: 15, remaining: 15 });
    expect(result.categories).toEqual([]);
    expect(result.recentSoloGames).toEqual([]);
  });

  it('should return season rank and score when user has active season entry', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.season.findFirst.mockResolvedValue({
      id: 'season-1',
      jalaliYear: 1405,
      jalaliMonth: 6,
      isActive: true,
    });
    prisma.seasonEntry.findFirst.mockResolvedValue({
      id: 'entry-1',
      seasonId: 'season-1',
      userId: 'user-123',
      score: 120,
    });
    prisma.seasonEntry.count.mockResolvedValue(4); // 4 users have higher score => rank 5
    prisma.dailyUsage.findUnique.mockResolvedValue({ soloRankedCount: 3 });
    prisma.category.findMany.mockResolvedValue([]);
    prisma.quizSession.findMany.mockResolvedValue([]);

    const result = await service.getHomeSummary('user-123');

    expect(result.season).toEqual({
      seasonId: 'season-1',
      jalaliYear: 1405,
      jalaliMonth: 6,
      score: 120,
      rank: 5,
    });
    expect(result.dailyQuota).toEqual({ used: 3, limit: 15, remaining: 12 });
  });

  it('should return active categories and recent solo games history', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.season.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.findUnique.mockResolvedValue({ soloRankedCount: 1 });

    const mockCategories = [
      {
        id: 'cat-1',
        title: 'General Knowledge',
        description: 'General questions',
        coverKey: 'cover-1',
        _count: { questions: 25 },
      },
    ];
    prisma.category.findMany.mockResolvedValue(mockCategories);

    const mockSessions = [
      {
        id: 'session-1',
        categoryId: 'cat-1',
        difficulty: Difficulty.MEDIUM,
        status: GameStatus.COMPLETED,
        isRanked: true,
        startedAt: new Date('2026-09-16T10:00:00Z'),
        completedAt: new Date('2026-09-16T10:02:00Z'),
        questions: [
          { status: AnswerStatus.CORRECT, question: { difficulty: Difficulty.MEDIUM } },
          { status: AnswerStatus.CORRECT, question: { difficulty: Difficulty.EASY } },
          { status: AnswerStatus.INCORRECT, question: { difficulty: Difficulty.HARD } },
        ],
      },
    ];
    prisma.quizSession.findMany.mockResolvedValue(mockSessions);

    const result = await service.getHomeSummary('user-123');

    expect(result.categories).toEqual([
      {
        id: 'cat-1',
        title: 'General Knowledge',
        description: 'General questions',
        coverKey: 'cover-1',
        questionCount: 25,
      },
    ]);

    expect(result.recentSoloGames.length).toBe(1);
    expect(result.recentSoloGames[0]).toMatchObject({
      id: 'session-1',
      categoryId: 'cat-1',
      categoryTitle: 'General Knowledge',
      difficulty: Difficulty.MEDIUM,
      correctAnswers: 2,
      totalQuestions: 3,
      earnedCoins: 5, // 2 (medium) + 1 (easy) + 2 (completion bonus) = 5
      earnedSeasonPoints: 3, // 2 (medium) + 1 (easy) = 3
    });
  });
});
