import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="skeleton-wrapper"
      [style.height]="height()"
      [style.width]="width()"
      [style.borderRadius]="radius()"
    >
      <div class="shimmer"></div>
    </div>
  `,
  styles: [
    `
      .skeleton-wrapper {
        background: var(--surface-card);
        position: relative;
        overflow: hidden;
        display: block;
      }

      .shimmer {
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.08) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }
    `,
  ],
})
export class LoadingSkeletonComponent {
  readonly height = input('48px');
  readonly width = input('100%');
  readonly radius = input('12px');
}
