import { InjectionToken, Signal } from '@angular/core';
import { Difficulty } from '@quiz/contracts';

export interface GameUser {
  readonly id: string;
  readonly phone: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarKey: string;
  readonly level: number;
  readonly xp: number;
  readonly xpToNextLevel: number;
  readonly coins: number;
  readonly seasonPoints: number;
  readonly seasonRank: number;
  readonly dailyStreak: number;
  readonly totalGames: number;
  readonly totalWins1v1: number;
  readonly totalCorrectAnswers: number;
  readonly favoriteCategoryIds: readonly string[];
}

export interface GameCategory {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly iconName: string;
  readonly color: string;
  readonly questionCount: number;
  readonly isPopular?: boolean;
}

export interface GameDailyMission {
  readonly id: string;
  readonly title: string;
  readonly rewardPoints: number;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly isCompleted: boolean;
  readonly icon: string;
}

/** Client-facing view model for questions — strictly omits correctIndex */
export interface GameQuestion {
  readonly id: string;
  readonly text: string;
  readonly categoryId: string;
  readonly categoryTitle: string;
  readonly difficulty: Difficulty;
  readonly options: readonly string[];
  readonly explanation?: string;
  readonly imageUrl?: string;
}

export interface GameMatchHistoryItem {
  readonly id: string;
  readonly mode: 'SOLO' | '1V1';
  readonly opponentName?: string;
  readonly opponentAvatar?: string;
  readonly result: 'WIN' | 'LOSS' | 'DRAW' | 'COMPLETED';
  readonly scoreText: string;
  readonly earnedCoins: number;
  readonly earnedPoints: number;
  readonly dateText: string;
}

export interface AnswerValidationResult {
  readonly isCorrect: boolean;
  readonly correctIndex: number;
}

export abstract class GameDataSource {
  abstract readonly currentUser: Signal<GameUser>;
  abstract readonly categories: Signal<readonly GameCategory[]>;
  abstract readonly dailyMissions: Signal<readonly GameDailyMission[]>;
  abstract readonly matchHistory: Signal<readonly GameMatchHistoryItem[]>;

  abstract addCoins(amount: number): void;
  abstract addSeasonPoints(amount: number): void;
  abstract getQuestions(categoryId?: string, difficulty?: Difficulty): GameQuestion[];
  abstract validateAnswer(questionId: string, selectedIndex: number): AnswerValidationResult;
}

export const GAME_DATA_SOURCE = new InjectionToken<GameDataSource>('GAME_DATA_SOURCE');
