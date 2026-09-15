import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { TimerRingComponent } from '../../shared/ui/timer-ring.component';
import { OptionButtonComponent, OptionState } from '../../shared/ui/option-button.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { DemoGameDataService, DemoQuestion } from '../../core/demo/demo-game-data.service';

export type MatchState =
  'SETUP' | 'SEARCHING' | 'FOUND_VS' | 'PLAYING' | 'RESULT_WIN' | 'RESULT_LOSS' | 'RESULT_DRAW';

@Component({
  selector: 'app-1v1',
  standalone: true,
  imports: [
    CommonModule,
    AppShellComponent,
    TimerRingComponent,
    OptionButtonComponent,
    DifficultyChipComponent,
  ],
  template: `
    <app-shell
      *ngIf="
        matchState === 'SETUP' ||
        matchState === 'RESULT_WIN' ||
        matchState === 'RESULT_LOSS' ||
        matchState === 'RESULT_DRAW'
      "
    >
      <div class="match-hub">
        <!-- SETUP STATE -->
        <div *ngIf="matchState === 'SETUP'" class="setup-view">
          <div class="hero-1v1">
            <div class="vs-badge">⚔️ رقابت دو‌نفره آنلاین</div>
            <h1 class="hero-title">نبرد هم‌زمان با حریف واقعی</h1>
            <p class="hero-subtitle">۵ سؤال مشترک، پاداش برد: <strong>۳ امتیاز + ۵ سکه</strong></p>
          </div>

          <div class="mode-select-card">
            <h2 class="card-title">تنظیمات رقابت</h2>
            <div class="option-row">
              <span class="label">دسته موضوعی:</span>
              <span class="value">همه دسته‌ها (تصادفی)</span>
            </div>
            <div class="option-row">
              <span class="label">سطح سختی:</span>
              <span class="value">متوسط</span>
            </div>
          </div>

          <button class="btn-find-match" (click)="startSearching()">
            <span class="btn-icon">⚡</span>
            <span>یافتن حریف و شروع مسابقه</span>
          </button>
        </div>

        <!-- OUTCOME RESULT STATES -->
        <div
          *ngIf="
            matchState === 'RESULT_WIN' ||
            matchState === 'RESULT_LOSS' ||
            matchState === 'RESULT_DRAW'
          "
          class="result-view"
        >
          <div class="result-banner" [ngClass]="matchState.toLowerCase()">
            <div class="result-icon">
              {{ matchState === 'RESULT_WIN' ? '🏆' : matchState === 'RESULT_LOSS' ? '💔' : '🤝' }}
            </div>
            <h2 class="result-title">
              {{
                matchState === 'RESULT_WIN'
                  ? 'شما پیروز شدید!'
                  : matchState === 'RESULT_LOSS'
                    ? 'حریف برنده شد'
                    : 'مسابقه مساوی شد!'
              }}
            </h2>
            <p class="result-score">نتیجه نهایی: {{ playerScore }} - {{ opponentScore }}</p>
          </div>

          <div class="reward-box">
            <h3 class="reward-heading">پاداش این مسابقه</h3>
            <div class="reward-row">
              <span class="reward-item"
                >🪙 +{{
                  matchState === 'RESULT_WIN' ? 5 : matchState === 'RESULT_DRAW' ? 3 : 1
                }}
                سکه</span
              >
              <span class="reward-item"
                >🏆 +{{
                  matchState === 'RESULT_WIN' ? 3 : matchState === 'RESULT_DRAW' ? 2 : 1
                }}
                امتیاز فصل</span
              >
            </div>
          </div>

          <div class="result-actions">
            <button class="btn-primary" (click)="startSearching()">🔄 رقابت مجدد</button>
            <button class="btn-secondary" (click)="resetSetup()">🏠 بازگشت به منو</button>
          </div>
        </div>
      </div>
    </app-shell>

    <!-- FULL SCREEN SEARCHING / VS INTRO / PLAYING OVERLAYS -->
    <div *ngIf="matchState === 'SEARCHING'" class="fullscreen-overlay searching-overlay">
      <div class="search-card">
        <div class="radar-pulse">
          <span class="radar-icon">📡</span>
        </div>
        <h2 class="search-title">در حال جستجوی حریف هم‌سطح...</h2>
        <p class="search-timer">زمان جستجو: {{ searchingSeconds }} ثانیه</p>
        <button class="cancel-btn" (click)="resetSetup()">انصراف از جستجو</button>
      </div>
    </div>

    <div *ngIf="matchState === 'FOUND_VS'" class="fullscreen-overlay vs-overlay">
      <div class="vs-card">
        <div class="vs-badge-tag">حریف پیدا شد!</div>
        <div class="matchup-row">
          <div class="player-col">
            <div class="avatar-ring">👑</div>
            <span class="player-name">{{ currentUser().displayName }}</span>
            <span class="player-rank">رتبه ۱۴#</span>
          </div>

          <div class="vs-divider">VS</div>

          <div class="player-col">
            <div class="avatar-ring opponent">🐺</div>
            <span class="player-name">کیارش_گیمر</span>
            <span class="player-rank">رتبه ۱۸#</span>
          </div>
        </div>
        <p class="starting-text">مسابقه تا ۳ ثانیه دیگر آغاز می‌شود...</p>
      </div>
    </div>

    <!-- ACTIVE SHARED QUESTION SCREEN -->
    <div *ngIf="matchState === 'PLAYING'" class="fullscreen-overlay playing-overlay">
      <div class="match-playing-frame">
        <!-- Live Match Header with Opponent Status -->
        <header class="match-header">
          <div class="player-score-box">
            <span class="name">{{ currentUser().displayName }}</span>
            <span class="score">{{ playerScore }}</span>
          </div>

          <app-timer-ring [secondsLeft]="secondsLeft" [totalSeconds]="30" />

          <div class="player-score-box opponent">
            <span class="name">کیارش_گیمر</span>
            <span class="score">{{ opponentScore }}</span>
          </div>
        </header>

        <!-- Opponent Live Status Bar -->
        <div class="opponent-status-bar" [class.answered]="opponentAnswered">
          <span class="status-dot"></span>
          <span>
            {{ opponentAnswered ? 'حریف پاسخ خود را ثبت کرد ✓' : 'حریف در حال فکر کردن است...' }}
          </span>
        </div>

        <!-- Question Card -->
        <main class="question-container" *ngIf="currentQuestion">
          <div class="question-meta">
            <span class="cat-chip">سؤال {{ currentIndex + 1 }} از ۵</span>
            <app-difficulty-chip [difficulty]="currentQuestion.difficulty" />
          </div>

          <div class="question-card">
            <h2 class="q-text">{{ currentQuestion.text }}</h2>
          </div>

          <div class="options-list">
            <app-option-button
              *ngFor="let optText of currentQuestion.options; let idx = index"
              [label]="getOptionLabel(idx)"
              [text]="optText"
              [state]="getOptionState(idx)"
              [disabled]="answered"
              (onClick)="selectOption(idx)"
            />
          </div>

          <div class="next-bar" *ngIf="answered">
            <button class="btn-next" (click)="advanceQuestion()">
              <span *ngIf="currentIndex < 4">سؤال بعدی &larr;</span>
              <span *ngIf="currentIndex === 4">مشاهده نتیجه نهایی 🏆</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .match-hub {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .hero-1v1 {
        background: linear-gradient(135deg, #06b6d4 0%, #1f1947 100%);
        border: 2px solid var(--secondary);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        text-align: center;
      }

      .vs-badge {
        display: inline-block;
        background: rgba(6, 182, 212, 0.2);
        color: var(--secondary);
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-full);
        font-size: 0.85rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      .hero-title {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .hero-subtitle {
        margin: 0.4rem 0 0;
        font-size: 0.88rem;
        color: var(--text-muted);
      }

      .mode-select-card {
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        padding: 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .card-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .option-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.88rem;
      }
      .option-row .label {
        color: var(--text-muted);
      }
      .option-row .value {
        font-weight: 700;
        color: var(--text-main);
      }

      .btn-find-match {
        width: 100%;
        padding: 1rem;
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        border-radius: var(--radius-md);
        color: #ffffff;
        font-weight: 900;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        box-shadow: var(--shadow-glow-secondary);
        transition: all var(--transition-fast);
      }
      .btn-find-match:hover {
        transform: translateY(-2px);
      }

      /* FULLSCREEN OVERLAYS */
      .fullscreen-overlay {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at 50% 20%, #1f1947 0%, #0f0c24 90%);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
      }

      .searching-overlay .search-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1.25rem;
      }

      .radar-pulse {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: rgba(6, 182, 212, 0.15);
        border: 2px solid var(--secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        animation: pulseRadar 1.5s infinite;
      }

      .search-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .search-timer {
        margin: 0;
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .cancel-btn {
        padding: 0.65rem 1.5rem;
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-main);
        border-radius: var(--radius-md);
        font-weight: 700;
        font-size: 0.9rem;
      }

      /* VS INTRO */
      .vs-card {
        width: 100%;
        max-width: 400px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .vs-badge-tag {
        background: var(--gold);
        color: #0f0c24;
        padding: 0.35rem 1rem;
        border-radius: var(--radius-full);
        font-weight: 900;
        font-size: 1.1rem;
        display: inline-block;
        margin: 0 auto;
      }

      .matchup-row {
        display: flex;
        align-items: center;
        justify-content: space-around;
      }

      .player-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .avatar-ring {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        border: 3px solid var(--primary);
        box-shadow: var(--shadow-glow-primary);
      }
      .avatar-ring.opponent {
        background: linear-gradient(135deg, #ef4444, #f97316);
        border-color: #ef4444;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
      }

      .player-name {
        font-weight: 800;
        font-size: 1rem;
        color: var(--text-main);
      }

      .player-rank {
        font-size: 0.78rem;
        color: var(--text-muted);
      }

      .vs-divider {
        font-size: 2.2rem;
        font-weight: 900;
        color: var(--gold-light);
        font-style: italic;
      }

      .starting-text {
        font-size: 0.9rem;
        color: var(--secondary);
      }

      /* PLAYING OVERLAY */
      .playing-overlay {
        padding: 0;
      }

      .match-playing-frame {
        width: 100%;
        max-width: 480px;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 1rem 1.25rem;
        gap: 1rem;
      }

      .match-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        padding: 0.6rem 1rem;
      }

      .player-score-box {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .player-score-box .name {
        font-size: 0.78rem;
        color: var(--text-muted);
      }
      .player-score-box .score {
        font-size: 1.4rem;
        font-weight: 900;
        color: var(--primary);
      }

      .player-score-box.opponent .score {
        color: var(--error);
      }

      .opponent-status-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--surface-border);
        padding: 0.5rem 0.85rem;
        border-radius: var(--radius-full);
        font-size: 0.8rem;
        color: var(--text-muted);
      }
      .opponent-status-bar.answered {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.4);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--gold);
        animation: pulse 1s infinite alternate;
      }
      .opponent-status-bar.answered .status-dot {
        background: var(--success);
        animation: none;
      }

      .question-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .question-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .cat-chip {
        font-weight: 700;
        font-size: 0.85rem;
        color: var(--gold-light);
      }

      .question-card {
        background: var(--surface-card);
        border: 1px solid var(--surface-border-bright);
        border-radius: var(--radius-md);
        padding: 1.25rem;
      }
      .q-text {
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.5;
        color: var(--text-main);
      }

      .options-list {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .btn-next {
        width: 100%;
        padding: 0.95rem;
        background: var(--primary);
        color: #ffffff;
        border-radius: var(--radius-md);
        font-weight: 800;
        font-size: 1rem;
      }

      /* RESULT VIEW */
      .result-view {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .result-banner {
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-lg);
        padding: 1.75rem;
        text-align: center;
      }
      .result-banner.result_win {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, var(--surface-card) 100%);
        border-color: var(--success);
      }
      .result-banner.result_loss {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, var(--surface-card) 100%);
        border-color: var(--error);
      }

      .result-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }
      .result-title {
        margin: 0 0 0.4rem;
        font-size: 1.4rem;
        font-weight: 800;
      }
      .result-score {
        margin: 0;
        font-size: 1rem;
        color: var(--text-muted);
        font-weight: 700;
      }

      .reward-box {
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        padding: 1rem;
        text-align: center;
      }
      .reward-heading {
        margin: 0 0 0.75rem;
        font-size: 0.9rem;
        color: var(--gold-light);
      }
      .reward-row {
        display: flex;
        justify-content: center;
        gap: 1.25rem;
        font-weight: 700;
      }

      .result-actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      @keyframes pulseRadar {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
        }
        70% {
          transform: scale(1.05);
          box-shadow: 0 0 0 20px rgba(6, 182, 212, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
        }
      }

      @keyframes pulse {
        from {
          opacity: 0.4;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class OneVOneComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly demoData = inject(DemoGameDataService);

  readonly currentUser = this.demoData.currentUser;

  matchState: MatchState = 'SETUP';
  searchingSeconds = 0;
  private searchTimerRef: any;

  questions: DemoQuestion[] = [];
  currentIndex = 0;
  secondsLeft = 30;
  private questionTimerRef: any;

  playerScore = 0;
  opponentScore = 0;
  selectedOptionIndex: number | null = null;
  answered = false;
  opponentAnswered = false;

  ngOnInit() {
    this.questions = this.demoData.sampleQuestions;
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  get currentQuestion(): DemoQuestion | undefined {
    return this.questions[this.currentIndex];
  }

  getOptionLabel(idx: number): string {
    return ['الف', 'ب', 'ج', 'د'][idx] || '';
  }

  getOptionState(idx: number): OptionState {
    if (!this.answered) {
      return this.selectedOptionIndex === idx ? 'SELECTED' : 'DEFAULT';
    }
    const q = this.currentQuestion;
    if (!q) return 'DEFAULT';
    if (idx === q.correctIndex) return 'CORRECT';
    if (this.selectedOptionIndex === idx && idx !== q.correctIndex) return 'INCORRECT';
    return 'DISABLED';
  }

  startSearching() {
    this.matchState = 'SEARCHING';
    this.searchingSeconds = 0;
    this.searchTimerRef = setInterval(() => {
      this.searchingSeconds++;
      if (this.searchingSeconds >= 3) {
        this.foundOpponent();
      }
    }, 1000);
  }

  private foundOpponent() {
    this.clearTimers();
    this.matchState = 'FOUND_VS';
    setTimeout(() => {
      this.startMatch();
    }, 2500);
  }

  private startMatch() {
    this.matchState = 'PLAYING';
    this.currentIndex = 0;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.startQuestionRound();
  }

  private startQuestionRound() {
    this.stopQuestionTimer();
    this.secondsLeft = 30;
    this.answered = false;
    this.selectedOptionIndex = null;
    this.opponentAnswered = false;

    // Simulate opponent answering after 4-7 seconds
    setTimeout(() => {
      if (this.matchState === 'PLAYING') {
        this.opponentAnswered = true;
        // 75% chance opponent gets it right
        if (Math.random() > 0.25) {
          this.opponentScore++;
        }
      }
    }, 4500);

    this.questionTimerRef = setInterval(() => {
      if (this.secondsLeft > 0) {
        this.secondsLeft--;
      } else {
        this.stopQuestionTimer();
        this.answered = true;
      }
    }, 1000);
  }

  selectOption(idx: number) {
    if (this.answered) return;
    this.stopQuestionTimer();
    this.selectedOptionIndex = idx;
    this.answered = true;

    const q = this.currentQuestion;
    if (q && idx === q.correctIndex) {
      this.playerScore++;
    }
  }

  advanceQuestion() {
    if (this.currentIndex < 4) {
      this.currentIndex++;
      this.startQuestionRound();
    } else {
      this.finishMatch();
    }
  }

  private finishMatch() {
    this.clearTimers();
    if (this.playerScore > this.opponentScore) {
      this.matchState = 'RESULT_WIN';
      this.demoData.addCoins(5);
      this.demoData.addSeasonPoints(3);
    } else if (this.playerScore < this.opponentScore) {
      this.matchState = 'RESULT_LOSS';
      this.demoData.addCoins(1);
      this.demoData.addSeasonPoints(1);
    } else {
      this.matchState = 'RESULT_DRAW';
      this.demoData.addCoins(3);
      this.demoData.addSeasonPoints(2);
    }
  }

  resetSetup() {
    this.clearTimers();
    this.matchState = 'SETUP';
  }

  private stopQuestionTimer() {
    if (this.questionTimerRef) {
      clearInterval(this.questionTimerRef);
      this.questionTimerRef = null;
    }
  }

  private clearTimers() {
    if (this.searchTimerRef) clearInterval(this.searchTimerRef);
    if (this.questionTimerRef) clearInterval(this.questionTimerRef);
    this.searchTimerRef = null;
    this.questionTimerRef = null;
  }
}
