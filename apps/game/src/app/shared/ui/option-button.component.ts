import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  booleanAttribute,
} from '@angular/core';

export type OptionState = 'DEFAULT' | 'SELECTED' | 'CORRECT' | 'INCORRECT' | 'DISABLED';

@Component({
  selector: 'app-option-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="option-btn"
      [class.state-selected]="state() === 'SELECTED'"
      [class.state-correct]="state() === 'CORRECT'"
      [class.state-incorrect]="state() === 'INCORRECT'"
      [class.state-disabled]="isDisabled()"
      [disabled]="isDisabled()"
      (click)="clicked.emit()"
    >
      <span class="option-badge">{{ label() }}</span>
      <span class="option-text">{{ text() }}</span>
      @if (state() === 'CORRECT') {
        <span class="state-icon" aria-hidden="true">✓</span>
      }
      @if (state() === 'INCORRECT') {
        <span class="state-icon" aria-hidden="true">✕</span>
      }
    </button>
  `,
  styles: [
    `
      .option-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.9rem 1.1rem;
        background: var(--surface-card);
        border: 2px solid var(--surface-border);
        border-radius: var(--radius-md);
        color: var(--text-main);
        font-size: 1rem;
        font-weight: 500;
        text-align: right;
        transition: all var(--transition-fast);
        position: relative;
        cursor: pointer;
      }

      .option-btn:hover:not(:disabled) {
        background: var(--surface-card-hover);
        border-color: var(--surface-border-bright);
        transform: translateY(-2px);
      }

      .option-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .option-btn:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }

      .option-badge {
        width: 32px;
        height: 32px;
        min-width: 32px;
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
        color: var(--text-muted);
        transition: all var(--transition-fast);
      }

      .option-text {
        flex: 1;
        line-height: 1.4;
      }

      .state-icon {
        font-weight: 900;
        font-size: 1.2rem;
        margin-left: 0.2rem;
      }

      .option-btn.state-selected {
        background: rgba(99, 102, 241, 0.2);
        border-color: var(--primary);
        box-shadow: var(--shadow-glow-primary);
      }
      .option-btn.state-selected .option-badge {
        background: var(--primary);
        color: #ffffff;
      }

      .option-btn.state-correct {
        background: var(--success-surface);
        border-color: var(--success);
        color: #ffffff;
        box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
      }
      .option-btn.state-correct .option-badge {
        background: var(--success);
        color: #ffffff;
      }

      .option-btn.state-incorrect {
        background: var(--error-surface);
        border-color: var(--error);
        color: #ffffff;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
      }
      .option-btn.state-incorrect .option-badge {
        background: var(--error);
        color: #ffffff;
      }

      .option-btn.state-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class OptionButtonComponent {
  readonly label = input('الف');
  readonly text = input('');
  readonly state = input<OptionState>('DEFAULT');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly clicked = output<void>();

  readonly isDisabled = computed(() => this.disabled() || this.state() === 'DISABLED');
}
