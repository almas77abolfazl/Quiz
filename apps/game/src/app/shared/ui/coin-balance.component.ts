import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-coin-balance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="coin-badge" [class.large]="size() === 'large'">
      <span class="coin-icon" aria-hidden="true">🪙</span>
      <span class="amount">{{ formattedAmount() }}</span>
      @if (showAdd()) {
        <button
          type="button"
          class="add-btn"
          title="افزایش سکه"
          aria-label="افزایش سکه"
          (click)="addClicked.emit()"
        >
          +
        </button>
      }
    </div>
  `,
  styles: [
    `
      .coin-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(245, 158, 11, 0.15);
        border: 1.5px solid rgba(245, 158, 11, 0.4);
        padding: 0.35rem 0.75rem;
        border-radius: var(--radius-full);
        color: var(--gold-light);
        font-weight: 700;
        font-size: 0.9rem;
        backdrop-filter: blur(8px);
        box-shadow: var(--shadow-glow-gold);
      }
      .coin-badge.large {
        padding: 0.5rem 1.1rem;
        font-size: 1.15rem;
        gap: 0.6rem;
      }
      .coin-icon {
        font-size: 1.1em;
        line-height: 1;
      }
      .amount {
        letter-spacing: 0.5px;
      }
      .add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--gold);
        color: #0f0c24;
        font-weight: 900;
        font-size: 0.85rem;
        margin-right: 0.2rem;
        border: none;
        cursor: pointer;
        transition: transform var(--transition-fast);
      }
      .add-btn:hover {
        transform: scale(1.15);
      }
    `,
  ],
})
export class CoinBalanceComponent {
  readonly amount = input(0);
  readonly showAdd = input(false);
  readonly size = input<'normal' | 'large'>('normal');

  readonly addClicked = output<void>();

  readonly formattedAmount = computed(() => this.amount().toLocaleString('fa-IR'));
}
