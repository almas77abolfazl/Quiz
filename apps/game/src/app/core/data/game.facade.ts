import { Injectable, inject } from '@angular/core';
import { Difficulty } from '@quiz/contracts';
import {
  AnswerValidationResult,
  GAME_DATA_SOURCE,
  GameCategory,
  GameDailyMission,
  GameDataSource,
  GameMatchHistoryItem,
  GameQuestion,
  GameUser,
} from './game-data-source.interface';
import { DemoGameDataSource } from '../demo/demo-game-data.service';

@Injectable({ providedIn: 'root' })
export class GameFacade {
  private readonly dataSource: GameDataSource =
    inject(GAME_DATA_SOURCE, { optional: true }) ?? inject(DemoGameDataSource);

  readonly user = this.dataSource.currentUser;
  readonly categories = this.dataSource.categories;
  readonly dailyMissions = this.dataSource.dailyMissions;
  readonly matchHistory = this.dataSource.matchHistory;

  addCoins(amount: number): void {
    this.dataSource.addCoins(amount);
  }

  addSeasonPoints(amount: number): void {
    this.dataSource.addSeasonPoints(amount);
  }

  getQuestions(categoryId?: string, difficulty?: Difficulty): GameQuestion[] {
    return this.dataSource.getQuestions(categoryId, difficulty);
  }

  validateAnswer(questionId: string, selectedIndex: number): AnswerValidationResult {
    return this.dataSource.validateAnswer(questionId, selectedIndex);
  }
}
