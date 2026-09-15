import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { AuthService } from '../../core/services/auth.service';
import { DemoGameDataService } from '../../core/demo/demo-game-data.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, AppShellComponent],
  template: `
    <app-shell>
      <div class="profile-page">
        <!-- Gamer Header Card -->
        <div class="profile-card">
          <div class="avatar-box">
            <span class="avatar-icon">👑</span>
            <button class="edit-avatar-btn" title="تغییر آواتار">✏️</button>
          </div>

          <div class="user-meta">
            <h1 class="display-name">{{ user().displayName }}</h1>
            <span class="username" dir="ltr">&#64;{{ user().username }}</span>
            <button class="edit-profile-btn" (click)="editProfilePlaceholder()">
              ویرایش پروفایل
            </button>
          </div>

          <!-- Level & XP Progress Bar -->
          <div class="level-progress-box">
            <div class="level-header">
              <span class="level-tag">سطح {{ user().level }}</span>
              <span class="xp-count">{{ user().xp }} / {{ user().xpToNextLevel }} XP</span>
            </div>
            <div class="xp-bar">
              <div class="xp-fill" [style.width.%]="(user().xp / user().xpToNextLevel) * 100"></div>
            </div>
          </div>
        </div>

        <!-- Player Statistics Grid -->
        <div class="section">
          <h2 class="section-title">آمار و عملکرد</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-icon">🎮</span>
              <span class="stat-val">{{ user().totalGames }}</span>
              <span class="stat-label">کل بازی‌ها</span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">✅</span>
              <span class="stat-val">{{ user().totalCorrectAnswers }}</span>
              <span class="stat-label">پاسخ‌های درست</span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">⚔️</span>
              <span class="stat-val">{{ user().totalWins1v1 }}</span>
              <span class="stat-label">بردهای 1v1</span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">🏆</span>
              <span class="stat-val">رتبه {{ user().seasonRank }}#</span>
              <span class="stat-label">رتبه فصل</span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">🔥</span>
              <span class="stat-val">{{ user().dailyStreak }} روز</span>
              <span class="stat-label">Streak فعال</span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">🪙</span>
              <span class="stat-val">{{ user().coins | number }}</span>
              <span class="stat-label">موجودی سکه</span>
            </div>
          </div>
        </div>

        <!-- Badges & Achievements Grid -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">نشان‌ها و افتخارات</h2>
            <span class="count-badge">۳ از ۵ کسب‌شده</span>
          </div>

          <div class="achievements-grid">
            <div *ngFor="let ach of achievements" class="ach-card" [class.locked]="!ach.isUnlocked">
              <div class="ach-icon">{{ ach.icon }}</div>
              <div class="ach-info">
                <span class="ach-title">{{ ach.title }}</span>
                <span class="ach-desc">{{ ach.description }}</span>
              </div>
              <span class="ach-progress" *ngIf="ach.progressText">{{ ach.progressText }}</span>
            </div>
          </div>
        </div>

        <!-- Match History List -->
        <div class="section">
          <h2 class="section-title">تاریخچه آخرین مسابقات</h2>
          <div class="history-list">
            <div *ngFor="let match of matchHistory" class="history-item">
              <span class="mode-icon">{{ match.mode === '1V1' ? '⚔️' : '🎯' }}</span>
              <div class="history-main">
                <span class="h-title">
                  {{
                    match.mode === '1V1'
                      ? 'مسابقه دو‌نفره ' + (match.opponentName ? 'با ' + match.opponentName : '')
                      : 'کوییز تک‌نفره'
                  }}
                </span>
                <span class="h-date">{{ match.dateText }}</span>
              </div>
              <div class="history-result">
                <span class="res-tag" [ngClass]="match.result.toLowerCase()">{{
                  match.scoreText
                }}</span>
                <span class="coins-earned">+{{ match.earnedCoins }} سکه</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sign Out Button -->
        <div class="logout-section">
          <button class="btn-logout" (click)="logout()">
            <span>🚪 خروج از حساب کاربری</span>
          </button>
        </div>
      </div>
    </app-shell>
  `,
  styles: [
    `
      .profile-page {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .profile-card {
        background: var(--surface-card);
        border: 1.5px solid var(--surface-border-bright);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .avatar-box {
        position: relative;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        border: 3px solid var(--primary);
        box-shadow: var(--shadow-glow-primary);
      }

      .edit-avatar-btn {
        position: absolute;
        bottom: -2px;
        left: -2px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--gold);
        color: #0f0c24;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      }

      .user-meta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
      }

      .display-name {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .username {
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .edit-profile-btn {
        margin-top: 0.4rem;
        padding: 0.35rem 0.85rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-full);
        color: var(--secondary);
        font-size: 0.78rem;
        font-weight: 600;
      }

      .level-progress-box {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        background: rgba(0, 0, 0, 0.2);
        padding: 0.85rem;
        border-radius: var(--radius-md);
      }

      .level-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
      }
      .level-tag {
        font-weight: 800;
        color: var(--gold-light);
      }
      .xp-count {
        color: var(--text-muted);
      }

      .xp-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-full);
        overflow: hidden;
      }
      .xp-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--gold), #f59e0b);
        border-radius: var(--radius-full);
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .section-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .count-badge {
        font-size: 0.75rem;
        color: var(--text-dim);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.65rem;
      }

      .stat-card {
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
        padding: 0.85rem 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        text-align: center;
      }

      .stat-icon {
        font-size: 1.3rem;
      }
      .stat-val {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text-main);
      }
      .stat-label {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .achievements-grid {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .ach-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
      }
      .ach-card.locked {
        opacity: 0.5;
        filter: grayscale(1);
      }

      .ach-icon {
        font-size: 1.4rem;
      }
      .ach-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .ach-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }
      .ach-desc {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
      .ach-progress {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--gold-light);
      }

      .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .history-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0.85rem;
        background: var(--surface-card);
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-md);
      }

      .mode-icon {
        font-size: 1.2rem;
      }
      .history-main {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .h-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }
      .h-date {
        font-size: 0.75rem;
        color: var(--text-dim);
      }

      .history-result {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .res-tag {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-main);
      }
      .coins-earned {
        font-size: 0.75rem;
        color: var(--gold-light);
      }

      .logout-section {
        margin-top: 0.5rem;
      }

      .btn-logout {
        width: 100%;
        padding: 0.9rem;
        background: var(--error-surface);
        border: 1px solid var(--error-border);
        color: var(--error);
        border-radius: var(--radius-md);
        font-weight: 800;
        font-size: 0.95rem;
        transition: background var(--transition-fast);
      }
      .btn-logout:hover {
        background: rgba(239, 68, 68, 0.25);
      }
    `,
  ],
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly demoData = inject(DemoGameDataService);

  readonly user = this.demoData.currentUser;
  readonly achievements = this.demoData.achievements;
  readonly matchHistory = this.demoData.matchHistory;

  editProfilePlaceholder() {
    alert('امکان ویرایش نام نمایشی و آواتار در نسخه آینده فعال خواهد شد.');
  }

  logout() {
    this.auth.setAccessToken(null);
    this.router.navigate(['/login']);
  }
}
