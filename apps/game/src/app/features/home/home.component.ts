import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { DemoGameDataService } from '../../core/demo/demo-game-data.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  template: `
    <app-shell>
      <div class="home-hub">
        <!-- Banner: Quick Play Primary Focal Point -->
        <section class="hero-quick-play">
          <div class="hero-content">
            <div class="hero-badge">
              <span>⚡ شروع سریع فصلی</span>
            </div>
            <h1 class="hero-title">آماده چالش اطلاعات عمومی هستی؟</h1>
            <p class="hero-subtitle">۵ سؤال، ۳۰ ثانیه زمان، کسب سکه و امتیاز فصل</p>

            <button class="btn-quick-play" (click)="quickPlay()">
              <span class="play-icon">▶</span>
              <span class="play-text">شروع بازی سریع</span>
            </button>
          </div>
          <div class="hero-glow"></div>
        </section>

        <!-- Monthly Season Countdown Card -->
        <section class="season-countdown-card">
          <div class="countdown-header">
            <div class="season-title">
              <span class="icon">📅</span>
              <span>فصل شهریور ۱۴۰۵</span>
            </div>
            <span class="timer-badge">۱۴ روز تا پایان فصل</span>
          </div>
          <div class="season-progress-bar">
            <div class="progress-fill" style="width: 53%;"></div>
          </div>
        </section>

        <!-- Game Modes Section -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">حالت‌های بازی</h2>
          </div>

          <div class="modes-grid">
            <!-- Mode 1: Solo -->
            <div class="mode-card primary-mode" (click)="goToQuiz()">
              <div class="mode-icon-wrapper">
                <span class="mode-icon">🎯</span>
              </div>
              <div class="mode-info">
                <h3 class="mode-name">تک‌نفره</h3>
                <p class="mode-desc">پاسخ به ۵ سؤال و دریافت سکه مستقیم</p>
              </div>
              <span class="mode-arrow">&larr;</span>
            </div>

            <!-- Mode 2: 1v1 -->
            <div class="mode-card accent-mode" (click)="goTo1v1()">
              <div class="mode-icon-wrapper">
                <span class="mode-icon">⚔️</span>
              </div>
              <div class="mode-info">
                <h3 class="mode-name">رقابت دو‌نفره (1v1)</h3>
                <p class="mode-desc">مسابقه هم‌زمان با حریف واقعی آنلاین</p>
              </div>
              <span class="mode-arrow">&larr;</span>
            </div>

            <!-- Mode 3: Group (Disabled) -->
            <div class="mode-card disabled-mode">
              <div class="mode-icon-wrapper">
                <span class="mode-icon">👥</span>
              </div>
              <div class="mode-info">
                <div class="mode-title-row">
                  <h3 class="mode-name">گروهی</h3>
                  <span class="coming-soon-chip">به‌زودی</span>
                </div>
                <p class="mode-desc">لابی ۶ نفره و رقابت دوستانه</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Daily Missions Section -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">مأموریت‌های روزانه</h2>
            <span class="refresh-note">بازنشانی در ۲۴ ساعت</span>
          </div>

          <div class="missions-list">
            <div
              *ngFor="let mission of dailyMissions"
              class="mission-card"
              [class.completed]="mission.isCompleted"
            >
              <div class="mission-icon">{{ mission.isCompleted ? '✅' : '📜' }}</div>
              <div class="mission-body">
                <span class="mission-text">{{ mission.title }}</span>
                <div class="mission-progress">
                  <div class="bar">
                    <div
                      class="fill"
                      [style.width.%]="(mission.currentProgress / mission.targetProgress) * 100"
                    ></div>
                  </div>
                  <span class="count"
                    >{{ mission.currentProgress }}/{{ mission.targetProgress }}</span
                  >
                </div>
              </div>
              <div class="mission-reward">
                <span class="reward-pts">+{{ mission.rewardPoints }} امتیاز</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Favorite Categories Section -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">دسته‌های پیشنهادی</h2>
            <button class="view-all-btn" (click)="goToQuiz()">مشاهده همه</button>
          </div>

          <div class="categories-scroll">
            <div
              *ngFor="let cat of categories"
              class="category-chip-card"
              (click)="startQuizWithCategory(cat.id)"
            >
              <span class="cat-icon">🎨</span>
              <div class="cat-meta">
                <span class="cat-title">{{ cat.title }}</span>
                <span class="cat-count">{{ cat.questionCount }} سؤال</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Monthly Prize Preview -->
        <section class="section">
          <div class="prize-card">
            <div class="prize-badge">🎁 جوایز فصل جاری</div>
            <div class="prize-content">
              <div class="prize-icon">🏆</div>
              <div class="prize-text">
                <h3 class="prize-title">کنسول گیمینگ و ۵,۰۰۰ سکه</h3>
                <p class="prize-desc">برای رتبه‌های اول تا سوم فصلی شهریور ماه</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Activity Summary -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">آخرین بازی‌ها</h2>
          </div>

          <div class="activity-list">
            <div *ngFor="let match of matchHistory" class="activity-item">
              <div class="activity-badge" [ngClass]="match.result.toLowerCase()">
                <span>{{ match.mode === '1V1' ? '⚔️' : '🎯' }}</span>
              </div>
              <div class="activity-info">
                <span class="activity-title">
                  {{
                    match.mode === '1V1'
                      ? 'مسابقه دو‌نفره ' + (match.opponentName ? 'با ' + match.opponentName : '')
                      : 'کوییز تک‌نفره'
                  }}
                </span>
                <span class="activity-time">{{ match.dateText }}</span>
              </div>
              <div class="activity-score">
                <span class="score-text">{{ match.scoreText }}</span>
                <span class="coins-earned">+{{ match.earnedCoins }} سکه</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </app-shell>
  `,
  styles: [
    `
      .home-hub {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      /* Hero Quick Play Banner */
      .hero-quick-play {
        position: relative;
        background: linear-gradient(135deg, #372a8c 0%, #1f1947 100%);
        border: 2px solid #5245ad;
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .hero-content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.6rem;
      }

      .hero-badge {
        background: rgba(245, 158, 11, 0.2);
        border: 1px solid var(--gold);
        color: var(--gold-light);
        padding: 0.2rem 0.6rem;
        border-radius: var(--radius-full);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .hero-title {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.3;
      }

      .hero-subtitle {
        margin: 0 0 0.5rem;
        font-size: 0.88rem;
        color: var(--text-muted);
      }

      .btn-quick-play {
        width: 100%;
        padding: 0.95rem 1.5rem;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border-radius: var(--radius-md);
        color: #0f0c24;
        font-weight: 900;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        box-shadow: var(--shadow-glow-gold);
        transition: all var(--transition-fast);
      }

      .btn-quick-play:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
      }
      .btn-quick-play:active {
        transform: translateY(0);
      }

      .play-icon {
        font-size: 1.1rem;
      }

      .hero-glow {
        position: absolute;
        top: -50%;
        left: -20%;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
        pointer-events: none;
      }

      /* Season Countdown */
      .season-countdown-card {
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .countdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;
      }

      .season-title {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .timer-badge {
        color: var(--secondary);
        font-weight: 600;
        font-size: 0.8rem;
      }

      .season-progress-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-full);
        overflow: hidden;
      }
      .season-progress-bar .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--secondary), var(--primary));
        border-radius: var(--radius-full);
      }

      /* Section Layout */
      .section {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .section-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .refresh-note {
        font-size: 0.75rem;
        color: var(--text-dim);
      }

      .view-all-btn {
        color: var(--secondary);
        font-size: 0.85rem;
        font-weight: 600;
      }

      /* Modes Grid */
      .modes-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .mode-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--surface-card);
        border: 1.5px solid var(--surface-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .mode-card:hover:not(.disabled-mode) {
        background: var(--surface-card-hover);
        border-color: var(--surface-border-bright);
        transform: translateX(-4px);
      }

      .primary-mode {
        border-right: 4px solid var(--primary);
      }
      .accent-mode {
        border-right: 4px solid var(--secondary);
      }

      .disabled-mode {
        opacity: 0.6;
        cursor: not-allowed;
        border-right: 4px solid var(--text-dim);
      }

      .mode-icon-wrapper {
        width: 46px;
        height: 46px;
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
      }

      .mode-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .mode-title-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .mode-name {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .mode-desc {
        margin: 0;
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      .coming-soon-chip {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-muted);
        padding: 0.1rem 0.4rem;
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
      }

      .mode-arrow {
        font-size: 1.2rem;
        color: var(--text-muted);
      }

      /* Missions */
      .missions-list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .mission-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
      }
      .mission-card.completed {
        background: rgba(16, 185, 129, 0.08);
        border-color: rgba(16, 185, 129, 0.3);
      }

      .mission-icon {
        font-size: 1.3rem;
      }

      .mission-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .mission-text {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-main);
      }

      .mission-progress {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .mission-progress .bar {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-full);
        overflow: hidden;
      }
      .mission-progress .fill {
        height: 100%;
        background: var(--gold);
        border-radius: var(--radius-full);
      }

      .mission-progress .count {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .reward-pts {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--gold-light);
        background: rgba(245, 158, 11, 0.15);
        padding: 0.2rem 0.5rem;
        border-radius: var(--radius-full);
        white-space: nowrap;
      }

      /* Categories Horizontal Scroll */
      .categories-scroll {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding-bottom: 0.4rem;
      }

      .category-chip-card {
        min-width: 140px;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.75rem 0.85rem;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-fast);
        flex-shrink: 0;
      }
      .category-chip-card:hover {
        background: var(--surface-card-hover);
        border-color: var(--primary);
      }

      .cat-icon {
        font-size: 1.3rem;
      }

      .cat-meta {
        display: flex;
        flex-direction: column;
      }

      .cat-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .cat-count {
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      /* Monthly Prize Card */
      .prize-card {
        background: linear-gradient(
          135deg,
          rgba(245, 158, 11, 0.15) 0%,
          rgba(99, 102, 241, 0.15) 100%
        );
        border: 1.5px solid var(--gold);
        border-radius: var(--radius-md);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .prize-badge {
        font-size: 0.78rem;
        font-weight: 800;
        color: var(--gold-light);
      }

      .prize-content {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .prize-icon {
        font-size: 2rem;
      }

      .prize-title {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .prize-desc {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: var(--text-muted);
      }

      /* Activity List */
      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0.85rem;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
      }

      .activity-badge {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        font-size: 1.1rem;
      }

      .activity-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .activity-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .activity-time {
        font-size: 0.75rem;
        color: var(--text-dim);
      }

      .activity-score {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .score-text {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .coins-earned {
        font-size: 0.75rem;
        color: var(--gold-light);
        font-weight: 600;
      }
    `,
  ],
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly demoData = inject(DemoGameDataService);

  readonly dailyMissions = this.demoData.dailyMissions;
  readonly categories = this.demoData.categories;
  readonly matchHistory = this.demoData.matchHistory;

  quickPlay() {
    this.router.navigate(['/quiz']);
  }

  goToQuiz() {
    this.router.navigate(['/quiz']);
  }

  goTo1v1() {
    this.router.navigate(['/1v1']);
  }

  startQuizWithCategory(catId: string) {
    this.router.navigate(['/quiz'], { queryParams: { categoryId: catId } });
  }
}
