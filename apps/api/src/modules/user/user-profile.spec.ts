import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { GameStatus, AnswerStatus, Difficulty } from '@quiz/contracts';

describe('UserService - getProfileDetails', () => {
  let service: UserService;
  let prisma: any;

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
      quizSession: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      quizSessionQuestion: {
        count: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
      categoryFollow: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should throw NotFoundException if user does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.getProfileDetails('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should return real authenticated profile statistics and masked phone', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.season.findFirst.mockResolvedValue({
      id: 'season-1',
      isActive: true,
    });
    prisma.seasonEntry.findFirst.mockResolvedValue({
      id: 'entry-1',
      seasonId: 'season-1',
      userId: 'user-123',
      score: 150,
    });
    prisma.seasonEntry.count.mockResolvedValue(2); // rank 3
    prisma.quizSession.count.mockResolvedValue(10); // 10 completed solo games
    prisma.quizSessionQuestion.count
      .mockResolvedValueOnce(30) // total correct
      .mockResolvedValueOnce(8) // total incorrect
      .mockResolvedValueOnce(2); // total timed out
    // Total answers = 40. Accuracy = (30/40)*100 = 75.0%

    prisma.quizSession.findMany.mockResolvedValue([]);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.categoryFollow.findMany.mockResolvedValue([]);

    const result = await service.getProfileDetails('user-123');

    expect(result.id).toBe('user-123');
    expect(result.displayName).toBe('Test Player');
    expect(result.username).toBe('testplayer');
    expect(result.maskedPhone).toBe('0912***6789');
    expect(result.coins).toBe(250);
    expect(result.dailyStreak).toBe(3);
    expect(result.seasonScore).toBe(150);
    expect(result.seasonRank).toBe(3);
    expect(result.stats).toEqual({
      totalCompletedSoloGames: 10,
      totalCorrectAnswers: 30,
      totalIncorrectAnswers: 8,
      totalTimedOutAnswers: 2,
      answerAccuracy: 75,
    });
    expect(result.earnedBadges).toEqual([]);
    expect(result.favoriteCategories).toEqual([]);
  });

  it('should return empty state when user has no active season, history, or favorites', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.season.findFirst.mockResolvedValue(null);
    prisma.quizSession.count.mockResolvedValue(0);
    prisma.quizSessionQuestion.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.quizSession.findMany.mockResolvedValue([]);
    prisma.category.findMany.mockResolvedValue([]);
    prisma.categoryFollow.findMany.mockResolvedValue([]);

    const result = await service.getProfileDetails('user-123');

    expect(result.seasonScore).toBe(0);
    expect(result.seasonRank).toBeNull();
    expect(result.stats).toEqual({
      totalCompletedSoloGames: 0,
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalTimedOutAnswers: 0,
      answerAccuracy: 0,
    });
    expect(result.recentSoloGames).toEqual([]);
    expect(result.favoriteCategories).toEqual([]);
    expect(result.earnedBadges).toEqual([]);
  });
});
