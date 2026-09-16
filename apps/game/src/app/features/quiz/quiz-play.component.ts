import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimerRingComponent } from '../../shared/ui/timer-ring.component';
import { OptionButtonComponent, OptionState } from '../../shared/ui/option-button.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import {
  SoloQuizApiService,
  StartQuizResponse,
  QuizSessionQuestionResponse,
} from '../../core/services/solo-quiz-api.service';
import { PlayerQuestionDto, AnswerFeedbackDto } from '@quiz/contracts';

export interface UserAnswerRecord {
  question: PlayerQuestionDto;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  isCorrect: boolean;
  feedback?: AnswerFeedbackDto;
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
  private readonly soloQuizApi = inject(SoloQuizApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly quizSession = signal<StartQuizResponse | null>(null);
  readonly questions = signal<QuizSessionQuestionResponse[]>([]);
  readonly currentIndex = signal<number>(0);
  readonly secondsLeft = signal<number>(30);
  private timerRef: ReturnType<typeof setInterval> | null = null;

  readonly selectedOptionId = signal<string | null>(null);
  readonly answered = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isAnswerCorrect = signal<boolean>(false);
  readonly correctOptionId = signal<string | null>(null);
  readonly submissionError = signal<string | null>(null);
  readonly pendingRetryOptionId = signal<string | null | undefined>(undefined);

  readonly isFinishing = signal<boolean>(false);
  readonly finishError = signal<string | null>(null);

  readonly userAnswers = signal<UserAnswerRecord[]>([]);
  readonly confirmQuit = signal<boolean>(false);
  readonly hasSessionError = signal<boolean>(false);

  readonly currentQuizQuestion = computed<QuizSessionQuestionResponse | undefined>(() => {
    const list = this.questions();
    const idx = this.currentIndex();
    return list[idx];
  });

  readonly currentQuestion = computed<PlayerQuestionDto | undefined>(() => {
    return this.currentQuizQuestion()?.question;
  });

  ngOnInit(): void {
    const navState = history.state;
    if (navState && navState.session && navState.session.questions?.length > 0) {
      this.quizSession.set(navState.session);
      this.questions.set(navState.session.questions);
      this.currentIndex.set(0);
      this.startQuestionTimer();
    } else {
      this.hasSessionError.set(true);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  getOptionLabel(idx: number): string {
    const labels = ['الف', 'ب', 'ج', 'د'];
    return labels[idx] || '';
  }

  getOptionState(optionId: string): OptionState {
    if (!this.answered()) {
      return this.selectedOptionId() === optionId ? 'SELECTED' : 'DEFAULT';
    }

    const correctId = this.correctOptionId();
    if (optionId === correctId) {
      return 'CORRECT';
    }
    if (this.selectedOptionId() === optionId && optionId !== correctId) {
      return 'INCORRECT';
    }
    return 'DISABLED';
  }

  selectOption(optionId: string): void {
    if (this.answered() || this.isSubmitting()) return;

    this.stopTimer();
    this.selectedOptionId.set(optionId);
    this.submissionError.set(null);
    this.sendAnswerSubmit(optionId);
  }

  retrySubmit(): void {
    const optionId = this.pendingRetryOptionId();
    this.submissionError.set(null);
    this.sendAnswerSubmit(optionId === undefined ? undefined : optionId);
  }

  private sendAnswerSubmit(optionId?: string | null): void {
    const session = this.quizSession();
    const q = this.currentQuizQuestion();
    if (!session || !q) return;

    this.isSubmitting.set(true);
    this.pendingRetryOptionId.set(optionId);

    const selectedOptId = optionId || undefined;

    this.soloQuizApi
      .submitAnswer(session.id, q.questionId, selectedOptId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.answered.set(true);
          this.isAnswerCorrect.set(res.isCorrect);
          this.correctOptionId.set(res.correctOptionId);
          this.submissionError.set(null);
          this.pendingRetryOptionId.set(undefined);

          const selectedOptText = q.question.options.find((o) => o.id === optionId)?.text || null;

          this.userAnswers.update((answers) => [
            ...answers,
            {
              question: q.question,
              selectedOptionId: optionId || null,
              selectedOptionText: selectedOptText,
              isCorrect: res.isCorrect,
              feedback: res.feedback,
            },
          ]);
        },
        error: () => {
          this.isSubmitting.set(false);
          // Do NOT mark as answered or wrong! Show retry button instead.
          this.submissionError.set(
            'خطا در برقراری ارتباط با سرور هنگام ثبت پاسخ. لطفاً دوباره تلاش کنید.',
          );
        },
      });
  }

  private startQuestionTimer(): void {
    this.stopTimer();
    this.secondsLeft.set(30);
    this.answered.set(false);
    this.selectedOptionId.set(null);
    this.isSubmitting.set(false);
    this.isAnswerCorrect.set(false);
    this.correctOptionId.set(null);
    this.submissionError.set(null);
    this.pendingRetryOptionId.set(undefined);

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
    if (this.answered() || this.isSubmitting()) return;
    this.selectedOptionId.set(null);
    this.sendAnswerSubmit(undefined);
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
      this.finishGameSession();
    }
  }

  finishGameSession(): void {
    const session = this.quizSession();
    if (!session) return;

    this.isFinishing.set(true);
    this.finishError.set(null);

    this.soloQuizApi
      .finishQuiz(session.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isFinishing.set(false);
          this.router.navigate(['/quiz/result'], {
            state: {
              correctCount: res.correctAnswers,
              incorrectCount: res.incorrectAnswers,
              timedOutCount: res.timedOutAnswers,
              totalQuestions: res.totalQuestions,
              earnedCoins: res.coinsEarned,
              earnedPoints: res.seasonPointsEarned,
              userAnswers: this.userAnswers(),
            },
          });
        },
        error: () => {
          this.isFinishing.set(false);
          this.finishError.set('خطا در ثبت و محاسبه نتیجه نهایی. لطفاً مجدداً تلاش کنید.');
        },
      });
  }

  quitGame(): void {
    this.stopTimer();
    this.router.navigate(['/']);
  }

  goToSetup(): void {
    this.stopTimer();
    this.router.navigate(['/quiz']);
  }
}
