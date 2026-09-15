import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TimerRingComponent } from '../../shared/ui/timer-ring.component';
import { OptionButtonComponent, OptionState } from '../../shared/ui/option-button.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { GameFacade } from '../../core/data/game.facade';
import { GameQuestion } from '../../core/data/game-data-source.interface';
import { Difficulty } from '@quiz/contracts';

export interface UserAnswerRecord {
  question: GameQuestion;
  selectedIndex: number | null;
  isCorrect: boolean;
}

@Component({
  selector: 'app-quiz-play',
  templateUrl: './quiz-play.component.html',
  styleUrl: './quiz-play.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TimerRingComponent,
    OptionButtonComponent,
    DifficultyChipComponent,
    ConfirmDialogComponent,
  ],
})
export class QuizPlayComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gameFacade = inject(GameFacade);

  readonly questions = signal<GameQuestion[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly secondsLeft = signal<number>(30);
  private timerRef: ReturnType<typeof setInterval> | null = null;

  readonly selectedOptionIndex = signal<number | null>(null);
  readonly answered = signal<boolean>(false);
  readonly isAnswerCorrect = signal<boolean>(false);
  readonly currentCorrectIndex = signal<number | null>(null);

  readonly userAnswers = signal<UserAnswerRecord[]>([]);
  readonly confirmQuit = signal<boolean>(false);

  readonly currentQuestion = computed<GameQuestion | undefined>(() => {
    const list = this.questions();
    const idx = this.currentIndex();
    return list[idx];
  });

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParams;
    const categoryId = queryParams['categoryId'];
    const difficulty = queryParams['difficulty'] as Difficulty | undefined;

    const loadedQuestions = this.gameFacade.getQuestions(categoryId, difficulty);
    this.questions.set(
      loadedQuestions.length > 0 ? loadedQuestions : this.gameFacade.getQuestions(),
    );
    this.startQuestionTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  getOptionLabel(idx: number): string {
    const labels = ['الف', 'ب', 'ج', 'د'];
    return labels[idx] || '';
  }

  getOptionState(idx: number): OptionState {
    if (!this.answered()) {
      return this.selectedOptionIndex() === idx ? 'SELECTED' : 'DEFAULT';
    }

    const correct = this.currentCorrectIndex();
    if (idx === correct) {
      return 'CORRECT';
    }
    if (this.selectedOptionIndex() === idx && idx !== correct) {
      return 'INCORRECT';
    }
    return 'DISABLED';
  }

  selectOption(index: number): void {
    if (this.answered()) return;

    this.stopTimer();
    const q = this.currentQuestion();
    if (!q) return;

    const validation = this.gameFacade.validateAnswer(q.id, index);
    this.selectedOptionIndex.set(index);
    this.answered.set(true);
    this.isAnswerCorrect.set(validation.isCorrect);
    this.currentCorrectIndex.set(validation.correctIndex);

    this.userAnswers.update((answers) => [
      ...answers,
      {
        question: q,
        selectedIndex: index,
        isCorrect: validation.isCorrect,
      },
    ]);
  }

  private startQuestionTimer(): void {
    this.stopTimer();
    this.secondsLeft.set(30);
    this.answered.set(false);
    this.selectedOptionIndex.set(null);
    this.isAnswerCorrect.set(false);
    this.currentCorrectIndex.set(null);

    this.timerRef = setInterval(() => {
      if (this.secondsLeft() > 0) {
        this.secondsLeft.update((s) => s - 1);
      } else {
        this.handleTimeout();
      }
    }, 1000);
  }

  private handleTimeout(): void {
    this.stopTimer();
    const q = this.currentQuestion();
    this.answered.set(true);
    this.selectedOptionIndex.set(null);
    this.isAnswerCorrect.set(false);

    if (q) {
      const validation = this.gameFacade.validateAnswer(q.id, -1);
      this.currentCorrectIndex.set(validation.correctIndex);
      this.userAnswers.update((answers) => [
        ...answers,
        {
          question: q,
          selectedIndex: null,
          isCorrect: false,
        },
      ]);
    }
  }

  private stopTimer(): void {
    if (this.timerRef !== null) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }

  goToNextQuestion(): void {
    if (this.currentIndex() < this.questions().length - 1) {
      this.currentIndex.update((i) => i + 1);
      this.startQuestionTimer();
    } else {
      // Finished all questions
      const answers = this.userAnswers();
      const correctCount = answers.filter((a) => a.isCorrect).length;
      const earnedCoins = correctCount * 1 + 2;
      const earnedPoints = correctCount * 2;

      this.gameFacade.addCoins(earnedCoins);
      this.gameFacade.addSeasonPoints(earnedPoints);

      this.router.navigate(['/quiz/result'], {
        state: {
          correctCount,
          totalQuestions: this.questions().length,
          earnedCoins,
          earnedPoints,
          userAnswers: answers,
        },
      });
    }
  }

  quitGame(): void {
    this.stopTimer();
    this.router.navigate(['/']);
  }
}
