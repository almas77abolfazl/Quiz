import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Difficulty } from '@quiz/contracts';

@Component({
  selector: 'app-difficulty-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="chip" [ngClass]="difficultyClass">
      <span class="dot"></span>
      <span>{{ label }}</span>
    </span>
  `,
  styles: [
    `
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.65rem;
        border-radius: var(--radius-full);
        font-size: 0.78rem;
        font-weight: 700;
        border: 1px solid transparent;
      }

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .easy {
        background: rgba(16, 185, 129, 0.15);
        border-color: rgba(16, 185, 129, 0.4);
        color: #34d399;
      }
      .easy .dot {
        background-color: #34d399;
      }

      .medium {
        background: rgba(6, 182, 212, 0.15);
        border-color: rgba(6, 182, 212, 0.4);
        color: #38bdf8;
      }
      .medium .dot {
        background-color: #38bdf8;
      }

      .hard {
        background: rgba(245, 158, 11, 0.15);
        border-color: rgba(245, 158, 11, 0.4);
        color: #fbbf24;
      }
      .hard .dot {
        background-color: #fbbf24;
      }

      .very-hard {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.4);
        color: #f87171;
      }
      .very-hard .dot {
        background-color: #f87171;
      }
    `,
  ],
})
export class DifficultyChipComponent {
  @Input() difficulty: Difficulty | string = Difficulty.EASY;

  get label(): string {
    switch (this.difficulty) {
      case Difficulty.EASY:
      case 'EASY':
        return 'آسان';
      case Difficulty.MEDIUM:
      case 'MEDIUM':
        return 'متوسط';
      case Difficulty.HARD:
      case 'HARD':
        return 'سخت';
      case Difficulty.VERY_HARD:
      case 'VERY_HARD':
        return 'خیلی سخت';
      default:
        return 'متوسط';
    }
  }

  get difficultyClass(): string {
    switch (this.difficulty) {
      case Difficulty.EASY:
      case 'EASY':
        return 'easy';
      case Difficulty.MEDIUM:
      case 'MEDIUM':
        return 'medium';
      case Difficulty.HARD:
      case 'HARD':
        return 'hard';
      case Difficulty.VERY_HARD:
      case 'VERY_HARD':
        return 'very-hard';
      default:
        return 'medium';
    }
  }
}
