import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';

@Component({
  selector: 'app-quiz-result',
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  template: `
    <app-shell>
      <div class="result-container">
        <!-- Result Header -->
        <div class="result-hero" [class.hero-success]="isHighPerformance">
          <div class="hero-icon">{{ isHighPerformance ? '🏆' : '👏' }}</div>
          <h1 class="hero-title">
            {{ isHighPerformance ? 'تست فوق‌العاده‌ای بود!' : 'تلاش خوبی بود!' }}
          </h1>
          <p class="hero-subtitle">
            {{
              isHighPerformance
                ? 'عملکرد عالی شما در این کوییز قابل تحسین است.'
                : 'با تمرین بیشتر می‌توانید تمام سؤالات را درست پاسخ دهید.'
            }}
          </p>
        </div>

        <!-- Score & Reward Breakdown Card -->
        <div class="summary-card">
          <div class="score-circle">
            <span class="count">{{ correctCount }}</span>
            <span class="total">از {{ totalQuestions }} درست</span>
          </div>

          <div class="rewards-row">
            <div class="reward-item">
              <span class="reward-icon">🪙</span>
              <span class="reward-val">+{{ earnedCoins }} سکه</span>
            </div>
            <div class="reward-item">
              <span class="reward-icon">🏆</span>
              <span class="reward-val">+{{ earnedPoints }} امتیاز فصل</span>
            </div>
          </div>
        </div>

        <!-- Answers Recap List -->
        <div class="section">
          <h2 class="section-title">خلاصه پاسخ‌های شما</h2>
          <div class="recap-list">
            <div
              *ngFor="let item of userAnswers; let i = index"
              class="recap-item"
              [class.correct]="item.isCorrect"
            >
              <span class="recap-badge">{{ item.isCorrect ? '✓' : '✕' }}</span>
              <div class="recap-info">
                <span class="q-title">سؤال {{ i + 1 }}: {{ item.question.text }}</span>
                <span class="q-answer" *ngIf="item.selectedIndex !== null"
                  >پاسخ شما: {{ item.question.options[item.selectedIndex] }}</span
                >
                <span class="q-answer timeout" *ngIf="item.selectedIndex === null"
                  >بدون پاسخ (زمان تمام شد)</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Action CTAs -->
        <div class="actions-grid">
          <button class="btn btn-primary" (click)="playAgain()">
            <span>🔄 بازی مجدد</span>
          </button>

          <button class="btn btn-secondary" (click)="goHome()">
            <span>🏠 بازگشت به خانه</span>
          </button>

          <button class="btn btn-disabled" title="این ویژگی در فاز بعد فعال می‌شود">
            <span>📤 اشتراک‌گذاری (به‌زودی)</span>
          </button>
        </div>
      </div>
    </app-shell>
  `,
  styles: [
    `
      .result-container {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .result-hero {
        text-align: center;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-lg);
        padding: 1.75rem 1.25rem;
      }

      .result-hero.hero-success {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--surface-card) 100%);
        border-color: rgba(16, 185, 129, 0.4);
      }

      .hero-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }

      .hero-title {
        margin: 0 0 0.35rem;
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .hero-subtitle {
        margin: 0;
        font-size: 0.88rem;
        color: var(--text-muted);
        line-height: 1.5;
      }

      .summary-card {
        background: var(--surface-card);
        border: 1.5px solid var(--surface-border-bright);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .score-circle {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.15);
        border: 3px solid var(--primary);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-glow-primary);
      }

      .score-circle .count {
        font-size: 2.2rem;
        font-weight: 900;
        color: var(--text-main);
        line-height: 1;
      }

      .score-circle .total {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 0.2rem;
      }

      .rewards-row {
        display: flex;
        gap: 1.5rem;
      }

      .reward-item {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.5rem 0.85rem;
        border-radius: var(--radius-full);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--gold-light);
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .section-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .recap-list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .recap-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.85rem;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
      }

      .recap-badge {
        width: 28px;
        height: 28px;
        min-width: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 0.85rem;
        background: var(--error-surface);
        color: var(--error);
        border: 1px solid var(--error-border);
      }

      .recap-item.correct .recap-badge {
        background: var(--success-surface);
        color: var(--success);
        border-color: var(--success-border);
      }

      .recap-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .q-title {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .q-answer {
        font-size: 0.8rem;
        color: var(--text-muted);
      }
      .q-answer.timeout {
        color: var(--error);
      }

      .actions-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .btn {
        width: 100%;
        padding: 0.9rem;
        border-radius: var(--radius-md);
        font-weight: 700;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--transition-fast);
      }

      .btn-primary {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #0f0c24;
        box-shadow: var(--shadow-glow-gold);
      }
      .btn-primary:hover {
        transform: translateY(-2px);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-main);
      }
      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .btn-disabled {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-dim);
        border: 1px dashed var(--surface-border);
        cursor: not-allowed;
      }
    `,
  ],
})
export class QuizResultComponent implements OnInit {
  private readonly router = inject(Router);

  correctCount = 4;
  totalQuestions = 5;
  earnedCoins = 6;
  earnedPoints = 8;
  userAnswers: any[] = [];

  ngOnInit() {
    const navState = history.state;
    if (navState && navState.totalQuestions) {
      this.correctCount = navState.correctCount || 0;
      this.totalQuestions = navState.totalQuestions || 5;
      this.earnedCoins = navState.earnedCoins || 0;
      this.earnedPoints = navState.earnedPoints || 0;
      this.userAnswers = navState.userAnswers || [];
    }
  }

  get isHighPerformance(): boolean {
    return this.correctCount >= 4;
  }

  playAgain() {
    this.router.navigate(['/quiz']);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
