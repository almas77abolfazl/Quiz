import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { TimerRingComponent } from '../../shared/ui/timer-ring.component';
import { OptionButtonComponent, OptionState } from '../../shared/ui/option-button.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { GameFacade } from '../../core/data/game.facade';
import { GameQuestion } from '../../core/data/game-data-source.interface';

export type MatchState =
  'SETUP' | 'SEARCHING' | 'FOUND_VS' | 'PLAYING' | 'RESULT_WIN' | 'RESULT_LOSS' | 'RESULT_DRAW';

@Component({
  selector: 'app-1v1',
  templateUrl: './1v1.component.html',
  styleUrl: './1v1.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent, TimerRingComponent, OptionButtonComponent, DifficultyChipComponent],
})
export class OneVOneComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly gameFacade = inject(GameFacade);

  readonly currentUser = this.gameFacade.user;
  readonly matchState = signal<MatchState>('SETUP');
  readonly searchingSeconds = signal<number>(0);
  private searchTimerRef: ReturnType<typeof setInterval> | null = null;
  private vsTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private opponentSimTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  readonly questions = signal<GameQuestion[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly secondsLeft = signal<number>(30);
  private questionTimerRef: ReturnType<typeof setInterval> | null = null;

  readonly playerScore = signal<number>(0);
  readonly opponentScore = signal<number>(0);
  readonly selectedOptionIndex = signal<number | null>(null);
  readonly answered = signal<boolean>(false);
  readonly opponentAnswered = signal<boolean>(false);
  readonly currentCorrectIndex = signal<number | null>(null);

  readonly currentQuestion = computed<GameQuestion | undefined>(() => {
    const list = this.questions();
    const idx = this.currentIndex();
    return list[idx];
  });

  ngOnInit(): void {
    this.questions.set(this.gameFacade.getQuestions());
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  getOptionLabel(idx: number): string {
    return ['الف', 'ب', 'ج', 'د'][idx] || '';
  }

  getOptionState(idx: number): OptionState {
    if (!this.answered()) {
      return this.selectedOptionIndex() === idx ? 'SELECTED' : 'DEFAULT';
    }

    const correct = this.currentCorrectIndex();
    if (idx === correct) return 'CORRECT';
    if (this.selectedOptionIndex() === idx && idx !== correct) return 'INCORRECT';
    return 'DISABLED';
  }

  startSearching(): void {
    this.clearTimers();
    this.matchState.set('SEARCHING');
    this.searchingSeconds.set(0);

    this.searchTimerRef = setInterval(() => {
      this.searchingSeconds.update((s) => s + 1);
      if (this.searchingSeconds() >= 3) {
        this.foundOpponent();
      }
    }, 1000);
  }

  private foundOpponent(): void {
    this.clearTimers();
    this.matchState.set('FOUND_VS');
    this.vsTimeoutRef = setTimeout(() => {
      this.startMatch();
    }, 2500);
  }

  private startMatch(): void {
    this.matchState.set('PLAYING');
    this.currentIndex.set(0);
    this.playerScore.set(0);
    this.opponentScore.set(0);
    this.startQuestionRound();
  }

  private startQuestionRound(): void {
    this.stopQuestionTimer();
    if (this.opponentSimTimeoutRef) {
      clearTimeout(this.opponentSimTimeoutRef);
      this.opponentSimTimeoutRef = null;
    }

    this.secondsLeft.set(30);
    this.answered.set(false);
    this.selectedOptionIndex.set(null);
    this.opponentAnswered.set(false);
    this.currentCorrectIndex.set(null);

    // Simulate opponent answering after 4.5 seconds
    this.opponentSimTimeoutRef = setTimeout(() => {
      if (this.matchState() === 'PLAYING') {
        this.opponentAnswered.set(true);
        if (Math.random() > 0.25) {
          this.opponentScore.update((s) => s + 1);
        }
      }
    }, 4500);

    this.questionTimerRef = setInterval(() => {
      if (this.secondsLeft() > 0) {
        this.secondsLeft.update((s) => s - 1);
      } else {
        this.stopQuestionTimer();
        this.answered.set(true);
      }
    }, 1000);
  }

  selectOption(idx: number): void {
    if (this.answered()) return;

    this.stopQuestionTimer();
    const q = this.currentQuestion();
    if (!q) return;

    const validation = this.gameFacade.validateAnswer(q.id, idx);
    this.selectedOptionIndex.set(idx);
    this.answered.set(true);
    this.currentCorrectIndex.set(validation.correctIndex);

    if (validation.isCorrect) {
      this.playerScore.update((s) => s + 1);
    }
  }

  advanceQuestion(): void {
    if (this.currentIndex() < 4) {
      this.currentIndex.update((i) => i + 1);
      this.startQuestionRound();
    } else {
      this.finishMatch();
    }
  }

  private finishMatch(): void {
    this.clearTimers();
    const pScore = this.playerScore();
    const oScore = this.opponentScore();

    if (pScore > oScore) {
      this.matchState.set('RESULT_WIN');
      this.gameFacade.addCoins(5);
      this.gameFacade.addSeasonPoints(3);
    } else if (pScore < oScore) {
      this.matchState.set('RESULT_LOSS');
      this.gameFacade.addCoins(1);
      this.gameFacade.addSeasonPoints(1);
    } else {
      this.matchState.set('RESULT_DRAW');
      this.gameFacade.addCoins(3);
      this.gameFacade.addSeasonPoints(2);
    }
  }

  resetSetup(): void {
    this.clearTimers();
    this.matchState.set('SETUP');
  }

  private stopQuestionTimer(): void {
    if (this.questionTimerRef !== null) {
      clearInterval(this.questionTimerRef);
      this.questionTimerRef = null;
    }
  }

  private clearTimers(): void {
    if (this.searchTimerRef !== null) {
      clearInterval(this.searchTimerRef);
      this.searchTimerRef = null;
    }
    if (this.questionTimerRef !== null) {
      clearInterval(this.questionTimerRef);
      this.questionTimerRef = null;
    }
    if (this.vsTimeoutRef !== null) {
      clearTimeout(this.vsTimeoutRef);
      this.vsTimeoutRef = null;
    }
    if (this.opponentSimTimeoutRef !== null) {
      clearTimeout(this.opponentSimTimeoutRef);
      this.opponentSimTimeoutRef = null;
    }
  }
}
