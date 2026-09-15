import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-card">
      <div class="icon-circle" aria-hidden="true">{{ icon() }}</div>
      <h3 class="title">{{ title() }}</h3>
      <p class="description">{{ description() }}</p>
      @if (actionText()) {
        <button type="button" class="action-btn" (click)="actionClicked.emit()">
          {{ actionText() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .empty-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2.5rem 1.5rem;
        background: var(--surface-card);
        border: 1.5px dashed var(--surface-border);
        border-radius: var(--radius-lg);
        margin: 1rem 0;
      }

      .icon-circle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        margin-bottom: 1rem;
      }

      .title {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .description {
        margin: 0 0 1.25rem;
        font-size: 0.88rem;
        color: var(--text-muted);
        max-width: 280px;
        line-height: 1.5;
      }

      .action-btn {
        padding: 0.65rem 1.4rem;
        background: var(--primary);
        color: #ffffff;
        border-radius: var(--radius-md);
        font-weight: 700;
        font-size: 0.9rem;
        border: none;
        cursor: pointer;
        transition: background var(--transition-fast);
      }

      .action-btn:hover {
        background: var(--primary-hover);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input('🔍');
  readonly title = input('موردی یافت نشد');
  readonly description = input('هیچ اطلاعاتی برای نمایش وجود ندارد.');
  readonly actionText = input<string | undefined>(undefined);

  readonly actionClicked = output<void>();
}
