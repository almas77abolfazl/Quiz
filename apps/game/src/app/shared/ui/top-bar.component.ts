import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinBalanceComponent } from './coin-balance.component';
import { SeasonBadgeComponent } from './season-badge.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, CoinBalanceComponent, SeasonBadgeComponent],
  template: `
    <header class="top-bar">
      <div class="user-profile" (click)="onProfileClick.emit()">
        <div class="avatar-frame">
          <span class="avatar-icon">👑</span>
        </div>
        <div class="user-meta">
          <span class="display-name">{{ displayName || 'بازیکن' }}</span>
          <div class="streak-badge" *ngIf="dailyStreak > 0" title="روزهای متوالی حضور">
            <span>🔥</span>
            <span>{{ dailyStreak }} روز</span>
          </div>
        </div>
      </div>

      <div class="right-badges">
        <app-coin-balance [amount]="coins" [showAdd]="true" />
        <app-season-badge [points]="seasonPoints" [rank]="seasonRank" />
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
        background: rgba(22, 18, 51, 0.85);
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
        transition: opacity var(--transition-fast);
      }
      .user-profile:hover {
        opacity: 0.9;
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
      }
      .avatar-icon {
        font-size: 1.3rem;
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
        max-width: 120px;
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
  @Input() displayName = '';
  @Input() coins = 0;
  @Input() seasonPoints = 0;
  @Input() seasonRank = 0;
  @Input() dailyStreak = 0;
  @Output() onProfileClick = new EventEmitter<void>();
}
