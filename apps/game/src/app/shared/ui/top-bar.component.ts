import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CoinBalanceComponent } from './coin-balance.component';
import { SeasonBadgeComponent } from './season-badge.component';

@Component({
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoinBalanceComponent, SeasonBadgeComponent],
  template: `
    <header class="top-bar">
      <div
        class="user-profile"
        role="button"
        tabindex="0"
        aria-label="مشاهده پروفایل کاربری"
        (click)="profileClicked.emit()"
        (keydown.enter)="profileClicked.emit()"
        (keydown.space)="profileClicked.emit(); $event.preventDefault()"
      >
        <div class="avatar-frame">
          <svg
            class="avatar-svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0 4c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5zm-6 4c.22-1.42 3.06-3 6-3s5.78 1.58 6 3z"
            />
          </svg>
        </div>
        <div class="user-meta">
          <span class="display-name">{{ displayName() || 'بازیکن' }}</span>
          @if (dailyStreak() > 0) {
            <div class="streak-badge" title="روزهای متوالی حضور">
              <span aria-hidden="true">🔥</span>
              <span>{{ dailyStreak() }} روز</span>
            </div>
          }
        </div>
      </div>

      <div class="right-badges">
        <app-coin-balance [amount]="coins()" [showAdd]="true" />
        <app-season-badge [points]="seasonPoints()" [rank]="seasonRank()" />
      </div>
    </header>
  `,
  styles: [
    `
      .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        background: rgba(22, 18, 51, 0.9);
        border-bottom: 1px solid var(--surface-border);
        backdrop-filter: blur(12px);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .user-profile {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        cursor: pointer;
        user-select: none;
        border-radius: var(--radius-md);
        padding: 0.2rem 0.4rem;
        transition:
          opacity var(--transition-fast),
          background var(--transition-fast);
      }
      .user-profile:hover {
        opacity: 0.95;
        background: rgba(255, 255, 255, 0.05);
      }
      .user-profile:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }

      .avatar-frame {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-glow-primary);
        border: 2px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
      .avatar-svg {
        width: 24px;
        height: 24px;
      }

      .user-meta {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }

      .display-name {
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--text-main);
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .streak-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        background: rgba(255, 87, 34, 0.2);
        color: #ff7043;
        padding: 0.05rem 0.4rem;
        border-radius: var(--radius-full);
        font-size: 0.75rem;
        font-weight: 700;
      }

      .right-badges {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      @media (max-width: 480px) {
        .top-bar {
          padding: 0.75rem 0.85rem;
        }
        .display-name {
          max-width: 90px;
          font-size: 0.85rem;
        }
        .right-badges {
          gap: 0.35rem;
        }
      }
    `,
  ],
})
export class TopBarComponent {
  readonly displayName = input('');
  readonly coins = input(0);
  readonly seasonPoints = input(0);
  readonly seasonRank = input(0);
  readonly dailyStreak = input(0);

  readonly profileClicked = output<void>();
}
