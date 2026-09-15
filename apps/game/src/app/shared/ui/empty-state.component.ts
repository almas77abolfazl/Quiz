import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input('🔍');
  readonly title = input('موردی یافت نشد');
  readonly description = input('هیچ اطلاعاتی برای نمایش وجود ندارد.');
  readonly actionText = input<string | undefined>(undefined);

  readonly actionClicked = output<void>();
}
