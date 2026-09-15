import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { DemoGameDataService, DemoCategory } from '../../core/demo/demo-game-data.service';
import { Difficulty } from '@quiz/contracts';

@Component({
  selector: 'app-quiz-setup',
  standalone: true,
  imports: [CommonModule, AppShellComponent, DifficultyChipComponent],
  template: `
    <app-shell>
      <div class="setup-container">
        <!-- Header -->
        <div class="setup-header">
          <button class="back-btn" (click)="goHome()">&rarr; بازگشت</button>
          <h1 class="page-title">تنظیمات کوییز تک‌نفره</h1>
        </div>

        <!-- Rules Info Card -->
        <div class="rules-card">
          <div class="rules-header">
            <span class="rules-icon">📋</span>
            <span class="rules-title">قوانین این مسابقه</span>
          </div>
          <ul class="rules-list">
            <li>⚡ شامل <strong>۵ سؤال چهار گزینه‌ای</strong> به صورت تصادفی.</li>
            <li>⏱️ <strong>۳۰ ثانیه زمان</strong> برای پاسخ به هر سؤال.</li>
            <li>🏆 پاسخ درست = <strong>امتیاز فصل + سکه پاداش</strong> (بر اساس درجه سختی).</li>
            <li>💡 عدم وابستگی امتیاز به سرعت پاسخ‌دهی.</li>
          </ul>
        </div>

        <!-- Category Selection -->
        <div class="section">
          <h2 class="section-title">انتخاب دسته موضوعی</h2>
          <div class="categories-grid">
            <button
              class="cat-option-btn"
              [class.active]="selectedCategoryId === 'ALL'"
              (click)="selectCategory('ALL')"
            >
              <span class="icon">🎲</span>
              <span class="label">همه دسته‌ها (تصادفی)</span>
            </button>

            <button
              *ngFor="let cat of categories"
              class="cat-option-btn"
              [class.active]="selectedCategoryId === cat.id"
              (click)="selectCategory(cat.id)"
            >
              <span class="icon">🎨</span>
              <span class="label">{{ cat.title }}</span>
            </button>
          </div>
        </div>

        <!-- Difficulty Selection -->
        <div class="section">
          <h2 class="section-title">سطح سختی سؤالات</h2>
          <div class="difficulty-options">
            <button
              *ngFor="let diff of difficulties"
              class="diff-btn"
              [class.active]="selectedDifficulty === diff.value"
              (click)="selectDifficulty(diff.value)"
            >
              <app-difficulty-chip [difficulty]="diff.value" />
              <span class="diff-reward">{{ diff.rewardText }}</span>
            </button>
          </div>
        </div>

        <!-- Selected Config Summary -->
        <div class="summary-card">
          <div class="summary-row">
            <span class="label">دسته انتخابی:</span>
            <span class="value">{{ selectedCategoryTitle }}</span>
          </div>
          <div class="summary-row">
            <span class="label">سطح سختی:</span>
            <span class="value"><app-difficulty-chip [difficulty]="selectedDifficulty" /></span>
          </div>
          <div class="summary-row">
            <span class="label">پاداش هر پاسخ درست:</span>
            <span class="value gold-text">{{ rewardSummaryText }}</span>
          </div>
        </div>

        <!-- Start CTA -->
        <div class="action-footer">
          <button class="btn-start-game" [disabled]="loading" (click)="startQuiz()">
            <span *ngIf="!loading">🚀 شروع کوییز (۵ سؤال)</span>
            <span *ngIf="loading">در حال آماده‌سازی سؤالات...</span>
          </button>
        </div>
      </div>
    </app-shell>
  `,
  styles: [
    `
      .setup-container {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .setup-header {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .back-btn {
        color: var(--secondary);
        font-weight: 700;
        font-size: 0.9rem;
      }

      .page-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .rules-card {
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        padding: 1rem 1.15rem;
      }

      .rules-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .rules-icon {
        font-size: 1.2rem;
      }
      .rules-title {
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--gold-light);
      }

      .rules-list {
        margin: 0;
        padding-right: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .section-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .categories-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .cat-option-btn {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.85rem;
        background: var(--surface-card);
        border: 1.5px solid var(--surface-border);
        border-radius: var(--radius-md);
        color: var(--text-main);
        font-weight: 600;
        font-size: 0.88rem;
        text-align: right;
        transition: all var(--transition-fast);
      }

      .cat-option-btn:hover {
        background: var(--surface-card-hover);
        border-color: var(--surface-border-bright);
      }

      .cat-option-btn.active {
        background: rgba(99, 102, 241, 0.2);
        border-color: var(--primary);
        box-shadow: var(--shadow-glow-primary);
        color: #ffffff;
      }

      .difficulty-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .diff-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.4rem;
        padding: 0.85rem;
        background: var(--surface-card);
        border: 1.5px solid var(--surface-border);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
      }

      .diff-btn.active {
        border-color: var(--gold);
        background: rgba(245, 158, 11, 0.1);
        box-shadow: var(--shadow-glow-gold);
      }

      .diff-reward {
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      .summary-card {
        background: rgba(22, 18, 51, 0.9);
        border: 1px solid var(--surface-border-bright);
        border-radius: var(--radius-md);
        padding: 1rem 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .summary-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.88rem;
      }

      .summary-row .label {
        color: var(--text-muted);
      }
      .summary-row .value {
        font-weight: 700;
        color: var(--text-main);
      }
      .gold-text {
        color: var(--gold-light);
      }

      .action-footer {
        margin-top: 0.5rem;
      }

      .btn-start-game {
        width: 100%;
        padding: 1rem;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: var(--radius-md);
        color: #ffffff;
        font-weight: 900;
        font-size: 1.1rem;
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        transition: all var(--transition-fast);
      }

      .btn-start-game:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(16, 185, 129, 0.6);
      }

      .btn-start-game:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class QuizSetupComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly demoData = inject(DemoGameDataService);

  get categories() {
    return this.demoData.categories();
  }
  selectedCategoryId = 'ALL';
  selectedDifficulty: Difficulty = Difficulty.MEDIUM;
  loading = false;

  difficulties = [
    { value: Difficulty.EASY, rewardText: '۱ امتیاز فصل + ۱ سکه' },
    { value: Difficulty.MEDIUM, rewardText: '۲ امتیاز فصل + ۱ سکه' },
    { value: Difficulty.HARD, rewardText: '۳ امتیاز فصل + ۲ سکه' },
    { value: Difficulty.VERY_HARD, rewardText: '۵ امتیاز فصل + ۳ سکه' },
  ];

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['categoryId']) {
        this.selectedCategoryId = params['categoryId'];
      }
    });
  }

  get selectedCategoryTitle(): string {
    if (this.selectedCategoryId === 'ALL') return 'همه دسته‌ها (تصادفی)';
    const cat = this.demoData.getCategoryById(this.selectedCategoryId);
    return cat ? cat.title : 'انتخاب نشده';
  }

  get rewardSummaryText(): string {
    switch (this.selectedDifficulty) {
      case Difficulty.EASY:
        return '۱ امتیاز + ۱ سکه بر اساس هر سؤال';
      case Difficulty.MEDIUM:
        return '۲ امتیاز + ۱ سکه بر اساس هر سؤال';
      case Difficulty.HARD:
        return '۳ امتیاز + ۲ سکه بر اساس هر سؤال';
      case Difficulty.VERY_HARD:
        return '۵ امتیاز + ۳ سکه بر اساس هر سؤال';
      default:
        return '';
    }
  }

  selectCategory(id: string) {
    this.selectedCategoryId = id;
  }

  selectDifficulty(diff: Difficulty) {
    this.selectedDifficulty = diff;
  }

  startQuiz() {
    this.loading = true;
    setTimeout(() => {
      this.router.navigate(['/quiz/play'], {
        queryParams: { categoryId: this.selectedCategoryId, difficulty: this.selectedDifficulty },
      });
    }, 400);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
