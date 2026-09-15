import { Component, ChangeDetectionStrategy, input, output, booleanAttribute } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly isOpen = input(false, { transform: booleanAttribute });
  readonly title = input('انصراف از بازی');
  readonly message = input('آیا از خروج اطمینان دارید؟ امتیاز این نوبت را از دست خواهید داد.');
  readonly confirmText = input('بله، خروج');
  readonly cancelText = input('ادامه بازی');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
