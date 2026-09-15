import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TimerRingComponent } from '../../shared/ui/timer-ring.component';
import { OptionButtonComponent, OptionState } from '../../shared/ui/option-button.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { DemoGameDataService, DemoQuestion } from '../../core/demo/demo-game-data.service';
import { Difficulty } from '@quiz/contracts';

@Component({
  selector: 'app-quiz-play',
  standalone: true,
  imports: [
    CommonModule,
    TimerRingComponent,
    OptionButtonComponent,
    DifficultyChipComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="quiz-play-page">
      <!-- Top Header & Quit Trigger -->
      <header class="quiz-header">
        <button class="quit-btn" (click)="confirmQuit = true">
          <span class="icon">✕</span>
          <span>خروج</span>
        </button>

        <div class="quiz-step-info">
          <span class="step-text">سؤال {{ currentIndex + 1 }} از {{ questions.length }}</span>
          <div class="step-dots">
            <span
              *ngFor="let q of questions; let i = index"
              class="dot"
              [class.active]="i === currentIndex"
              [class.done]="i < currentIndex"
            ></span>
          </div>
        </div>

        <app-timer-ring [secondsLeft]="secondsLeft" [totalSeconds]="30" />
      </header>

      <!-- Overall Progress Line -->
      <div class="progress-bar-container">
        <div
          class="progress-fill"
          [style.width.%]="((currentIndex + 1) / questions.length) * 100"
        ></div>
      </div>

      <!-- Main Question Container -->
      <main class="question-container" *ngIf="currentQuestion">
        <!-- Category & Difficulty Header -->
        <div class="question-meta">
          <span class="category-badge">🎨 {{ currentQuestion.categoryTitle }}</span>
          <app-difficulty-chip [difficulty]="currentQuestion.difficulty" />
        </div>

        <!-- Question Card -->
        <div class="question-card">
          <h2 class="question-text">{{ currentQuestion.text }}</h2>

          <!-- Optional Question Image Placeholder -->
          <div *ngIf="currentQuestion.imageUrl" class="question-image-box">
            <span class="img-placeholder-icon">🖼️</span>
            <span>تصویر مرتبط به سؤال</span>
          </div>
        </div>

        <!-- Feedback Alert Banner after answering -->
        <div
          *ngIf="answered"
          class="feedback-banner"
          [ngClass]="isAnswerCorrect ? 'correct-banner' : 'incorrect-banner'"
        >
          <span class="feedback-icon">{{ isAnswerCorrect ? '🎉' : '❌' }}</span>
          <span class="feedback-text">
            {{
              isAnswerCorrect
                ? 'پاسخ شما درست بود!'
                : secondsLeft === 0
                  ? 'زمان تمام شد!'
                  : 'پاسخ شما نادرست بود!'
            }}
          </span>
        </div>

        <!-- 4 Option Buttons -->
        <div class="options-grid">
          <app-option-button
            *ngFor="let optText of currentQuestion.options; let idx = index"
            [label]="getOptionLabel(idx)"
            [text]="optText"
            [state]="getOptionState(idx)"
            [disabled]="answered"
            (onClick)="selectOption(idx)"
          />
        </div>

        <!-- Next / Transition CTA Button -->
        <div class="action-bar" *ngIf="answered">
          <button class="btn-next-question" (click)="goToNextQuestion()">
            <span *ngIf="currentIndex < questions.length - 1">سؤال بعدی &larr;</span>
            <span *ngIf="currentIndex === questions.length - 1">مشاهده نتیجه نهایی &larr;</span>
          </button>
        </div>
      </main>

      <!-- Quit Confirmation Modal -->
      <app-confirm-dialog
        [isOpen]="confirmQuit"
        title="انصراف از کوییز"
        message="آیا مطمئن هستید که می‌خواهید از بازی خارج شوید؟ امتیاز این نوبت ذخیره نخواهد شد."
        confirmText="بله، خروج"
        cancelText="ادامه بازی"
        (onConfirm)="quitGame()"
        (onCancel)="confirmQuit = false"
      />
    </div>
  `,
  styles: [
    `
      .quiz-play-page {
        min-height: 100vh;
        max-width: 480px;
        margin: 0 auto;
        background: radial-gradient(circle at 50% 10%, #1f1947 0%, #0f0c24 80%);
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .quiz-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem 0.5rem;
      }

      .quit-btn {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-weight: 700;
        padding: 0.4rem 0.75rem;
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.08);
        transition: background var(--transition-fast);
      }
      .quit-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: var(--error);
      }

      .quiz-step-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
      }

      .step-text {
        font-weight: 800;
        font-size: 0.95rem;
        color: var(--text-main);
      }

      .step-dots {
        display: flex;
        gap: 0.35rem;
      }

      .step-dots .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all var(--transition-fast);
      }
      .step-dots .dot.active {
        background: var(--gold);
        transform: scale(1.25);
      }
      .step-dots .dot.done {
        background: var(--success);
      }

      .progress-bar-container {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.08);
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--secondary), var(--gold));
        transition: width 0.3s ease;
      }

      .question-container {
        flex: 1;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .question-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .category-badge {
        font-size: 0.85rem;
        font-weight: 700;
        color: #a5b4fc;
        background: rgba(99, 102, 241, 0.15);
        padding: 0.3rem 0.75rem;
        border-radius: var(--radius-full);
        border: 1px solid rgba(99, 102, 241, 0.3);
      }

      .question-card {
        background: var(--surface-card);
        border: 1.5px solid var(--surface-border-bright);
        border-radius: var(--radius-lg);
        padding: 1.5rem 1.25rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .question-text {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-main);
        line-height: 1.6;
        text-align: right;
      }

      .question-image-box {
        margin-top: 1rem;
        padding: 1.5rem;
        background: rgba(0, 0, 0, 0.2);
        border: 1px dashed var(--surface-border);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: var(--text-muted);
        font-size: 0.85rem;
      }

      .feedback-banner {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.85rem 1.15rem;
        border-radius: var(--radius-md);
        font-weight: 700;
        font-size: 0.95rem;
        animation: fadeIn 0.2s ease;
      }
      .correct-banner {
        background: var(--success-surface);
        border: 1px solid var(--success-border);
        color: #34d399;
      }
      .incorrect-banner {
        background: var(--error-surface);
        border: 1px solid var(--error-border);
        color: #f87171;
      }

      .options-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .action-bar {
        margin-top: auto;
        padding-top: 0.5rem;
      }

      .btn-next-question {
        width: 100%;
        padding: 1rem;
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        border-radius: var(--radius-md);
        color: #ffffff;
        font-weight: 900;
        font-size: 1.05rem;
        box-shadow: var(--shadow-glow-primary);
        transition: all var(--transition-fast);
      }
      .btn-next-question:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 25px rgba(99, 102, 241, 0.6);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class QuizPlayComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly demoData = inject(DemoGameDataService);

  questions: DemoQuestion[] = [];
  currentIndex = 0;
  secondsLeft = 30;
  private timerRef: any;

  selectedOptionIndex: number | null = null;
  answered = false;
  isAnswerCorrect = false;

  userAnswers: { question: DemoQuestion; selectedIndex: number | null; isCorrect: boolean }[] = [];
  confirmQuit = false;

  ngOnInit() {
    this.questions = [...this.demoData.sampleQuestions];
    this.startQuestionTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  get currentQuestion(): DemoQuestion | undefined {
    return this.questions[this.currentIndex];
  }

  getOptionLabel(idx: number): string {
    const labels = ['الف', 'ب', 'ج', 'د'];
    return labels[idx] || '';
  }

  getOptionState(idx: number): OptionState {
    if (!this.answered) {
      return this.selectedOptionIndex === idx ? 'SELECTED' : 'DEFAULT';
    }

    const q = this.currentQuestion;
    if (!q) return 'DEFAULT';

    if (idx === q.correctIndex) {
      return 'CORRECT';
    }
    if (this.selectedOptionIndex === idx && idx !== q.correctIndex) {
      return 'INCORRECT';
    }
    return 'DISABLED';
  }

  selectOption(index: number) {
    if (this.answered) return;

    this.stopTimer();
    this.selectedOptionIndex = index;
    this.answered = true;

    const q = this.currentQuestion;
    this.isAnswerCorrect = q ? index === q.correctIndex : false;

    if (q) {
      this.userAnswers.push({
        question: q,
        selectedIndex: index,
        isCorrect: this.isAnswerCorrect,
      });
    }
  }

  private startQuestionTimer() {
    this.stopTimer();
    this.secondsLeft = 30;
    this.answered = false;
    this.selectedOptionIndex = null;
    this.isAnswerCorrect = false;

    this.timerRef = setInterval(() => {
      if (this.secondsLeft > 0) {
        this.secondsLeft--;
      } else {
        this.handleTimeout();
      }
    }, 1000);
  }

  private handleTimeout() {
    this.stopTimer();
    this.answered = true;
    this.selectedOptionIndex = null;
    this.isAnswerCorrect = false;

    const q = this.currentQuestion;
    if (q) {
      this.userAnswers.push({
        question: q,
        selectedIndex: null,
        isCorrect: false,
      });
    }
  }

  private stopTimer() {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }

  goToNextQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.startQuestionTimer();
    } else {
      // Finished all 5 questions
      const correctCount = this.userAnswers.filter((a) => a.isCorrect).length;
      const earnedCoins = correctCount * 1 + 2; // completion reward + per answer
      const earnedPoints = correctCount * 2;

      this.demoData.addCoins(earnedCoins);
      this.demoData.addSeasonPoints(earnedPoints);

      this.router.navigate(['/quiz/result'], {
        state: {
          correctCount,
          totalQuestions: this.questions.length,
          earnedCoins,
          earnedPoints,
          userAnswers: this.userAnswers,
        },
      });
    }
  }

  quitGame() {
    this.stopTimer();
    this.router.navigate(['/']);
  }
}
