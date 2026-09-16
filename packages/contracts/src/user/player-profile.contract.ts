import { PlayerHomeRecentGameDto } from './player-home-summary.contract';

export interface PlayerProfileStatsDto {
  totalCompletedSoloGames: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  totalTimedOutAnswers: number;
  answerAccuracy: number;
}

export interface PlayerProfileBadgeDto {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

export interface PlayerProfileFavoriteCategoryDto {
  id: string;
  title: string;
  coverKey: string | null;
}

export interface PlayerProfileDto {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarKey: string | null;
  maskedPhone: string;
  coins: number;
  dailyStreak: number;
  seasonScore: number;
  seasonRank: number | null;
  stats: PlayerProfileStatsDto;
  recentSoloGames: PlayerHomeRecentGameDto[];
  favoriteCategories: PlayerProfileFavoriteCategoryDto[];
  earnedBadges: PlayerProfileBadgeDto[];
}
