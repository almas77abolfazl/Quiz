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
import { PlayerQuestionDto, AnswerStatus } from '@quiz/contracts';
import { UserAnswerRecord } from './models/quiz.models';

export type { UserAnswerRecord };

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

  private countdownTimerRef: ReturnType<typeof setInterval> | null = null;
  private autoAdvanceTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  readonly selectedOptionId = signal<string | null>(null);
  readonly answered = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isAdvancing = signal<boolean>(false);
  readonly isFinishing = signal<boolean>(false);

  readonly isAnswerCorrect = signal<boolean>(false);
  readonly isAnswerTimedOut = signal<boolean>(false);
  readonly correctOptionId = signal<string | null>(null);

  readonly submissionError = signal<string | null>(null);
  readonly advanceError = signal<string | null>(null);
  readonly finishError = signal<string | null>(null);
  readonly pendingRetryOptionId = signal<string | null | undefined>(undefined);

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
      this.startDeadlineCountdown();
    } else {
      this.hasSessionError.set(true);
    }
  }

  ngOnDestroy(): void {
    this.stopCountdownTimer();
    this.clearAutoAdvanceTimeout();
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
    if (this.answered() || this.isSubmitting() || this.isAdvancing() || this.isFinishing()) return;

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
          this.isAnswerTimedOut.set(res.status === AnswerStatus.TIMED_OUT);
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

          this.scheduleAutoAdvance();
        },
        error: () => {
          this.isSubmitting.set(false);
          // Do NOT mark as answered or wrong locally!
          this.submissionError.set(
            'خطا در برقراری ارتباط با سرور هنگام ثبت پاسخ. لطفاً دوباره تلاش کنید.',
          );
        },
      });
  }

  private startDeadlineCountdown(): void {
    this.stopCountdownTimer();
    this.updateSecondsLeft();
    this.countdownTimerRef = setInterval(() => {
      this.updateSecondsLeft();
    }, 200);
  }

  private updateSecondsLeft(): void {
    const q = this.currentQuizQuestion();
    if (!q || !q.deadlineAt) {
      this.secondsLeft.set(30);
      return;
    }

    const deadlineMs = new Date(q.deadlineAt).getTime();
    const remainingMs = deadlineMs - Date.now();
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    this.secondsLeft.set(remainingSec);

    if (remainingSec === 0 && !this.answered() && !this.isSubmitting()) {
      this.handleTimeout();
    }
  }

  private handleTimeout(): void {
    if (this.answered() || this.isSubmitting()) return;
    this.selectedOptionId.set(null);
    this.sendAnswerSubmit(undefined);
  }

  private stopCountdownTimer(): void {
    if (this.countdownTimerRef !== null) {
      clearInterval(this.countdownTimerRef);
      this.countdownTimerRef = null;
    }
  }

  private scheduleAutoAdvance(): void {
    this.clearAutoAdvanceTimeout();
    this.autoAdvanceTimeoutRef = setTimeout(() => {
      this.handleAutoAdvance();
    }, 1500);
  }

  private handleAutoAdvance(): void {
    this.clearAutoAdvanceTimeout();
    if (this.currentIndex() < this.questions().length - 1) {
      this.advanceToNextQuestion();
    } else {
      this.finishGameSession();
    }
  }

  private clearAutoAdvanceTimeout(): void {
    if (this.autoAdvanceTimeoutRef !== null) {
      clearTimeout(this.autoAdvanceTimeoutRef);
      this.autoAdvanceTimeoutRef = null;
    }
  }

  goToNextQuestion(): void {
    this.clearAutoAdvanceTimeout();
    if (this.isAdvancing() || this.isFinishing()) return;

    if (this.currentIndex() < this.questions().length - 1) {
      this.advanceToNextQuestion();
    } else {
      this.finishGameSession();
    }
  }

  advanceToNextQuestion(): void {
    const session = this.quizSession();
    if (!session || this.isAdvancing()) return;

    this.isAdvancing.set(true);
    this.advanceError.set(null);

    this.soloQuizApi
      .advanceQuiz(session.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isAdvancing.set(false);
          const nextIndex = this.currentIndex() + 1;

          this.questions.update((list) => {
            const updated = [...list];
            updated[nextIndex] = res.question;
            return updated;
          });

          this.currentIndex.set(nextIndex);
          this.answered.set(false);
          this.selectedOptionId.set(null);
          this.isSubmitting.set(false);
          this.isAnswerCorrect.set(false);
          this.isAnswerTimedOut.set(false);
          this.correctOptionId.set(null);
          this.submissionError.set(null);
          this.advanceError.set(null);
          this.pendingRetryOptionId.set(undefined);

          this.startDeadlineCountdown();
        },
        error: () => {
          this.isAdvancing.set(false);
          this.advanceError.set('خطا در دریافت سؤال بعدی. لطفاً مجدداً تلاش کنید.');
        },
      });
  }

  finishGameSession(): void {
    const session = this.quizSession();
    if (!session || this.isFinishing()) return;

    this.clearAutoAdvanceTimeout();
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
    this.stopCountdownTimer();
    this.clearAutoAdvanceTimeout();
    this.router.navigate(['/']);
  }

  goToSetup(): void {
    this.stopCountdownTimer();
    this.clearAutoAdvanceTimeout();
    this.router.navigate(['/quiz']);
  }
}
