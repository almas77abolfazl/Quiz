import { Difficulty } from '../enums/difficulty.enum';

export interface PlayerHomeSummaryUserDto {
  id: string;
  phone?: string;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  coins: number;
  dailyStreak: number;
}

export interface PlayerHomeSummarySeasonDto {
  seasonId: string;
  jalaliYear: number;
  jalaliMonth: number;
  score: number;
  rank: number | null;
}

export interface PlayerHomeSummaryDailyQuotaDto {
  used: number;
  limit: number;
  remaining: number;
}

export interface PlayerHomeSummaryCategoryDto {
  id: string;
  title: string;
  description: string | null;
  coverKey: string | null;
  questionCount: number;
}

export interface PlayerHomeRecentGameDto {
  id: string;
  categoryId: string | null;
  categoryTitle: string | null;
  difficulty: Difficulty | null;
  correctAnswers: number;
  totalQuestions: number;
  earnedCoins: number;
  earnedSeasonPoints: number;
  completedAt: string;
}

export interface PlayerHomeSummaryDto {
  user: PlayerHomeSummaryUserDto;
  season: PlayerHomeSummarySeasonDto | null;
  dailyQuota: PlayerHomeSummaryDailyQuotaDto;
  categories: PlayerHomeSummaryCategoryDto[];
  recentSoloGames: PlayerHomeRecentGameDto[];
}
