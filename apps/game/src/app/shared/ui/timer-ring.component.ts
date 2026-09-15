import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timer-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timer-container" [class.urgent]="secondsLeft <= 5">
      <svg class="timer-svg" viewBox="0 0 100 100" aria-hidden="true">
        <!-- Background circle -->
        <circle class="ring-bg" cx="50" cy="50" r="42" />
        <!-- Animated stroke circle -->
        <circle
          class="ring-progress"
          cx="50"
          cy="50"
          r="42"
          [style.strokeDashoffset]="strokeOffset"
        />
      </svg>
      <div class="timer-text">
        <span class="value">{{ secondsLeft }}</span>
        <span class="unit">ثانیه</span>
      </div>
    </div>
  `,
  styles: [
    `
      .timer-container {
        position: relative;
        width: 72px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .timer-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .ring-bg {
        fill: none;
        stroke: var(--surface-card);
        stroke-width: 7;
      }

      .ring-progress {
        fill: none;
        stroke: var(--secondary);
        stroke-width: 7;
        stroke-linecap: round;
        stroke-dasharray: 263.89; /* 2 * PI * 42 */
        transition:
          stroke-dashoffset 1s linear,
          stroke 0.3s ease;
      }

      .timer-container.urgent .ring-progress {
        stroke: var(--error);
        animation: pulse 0.5s infinite alternate;
      }

      .timer-text {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }

      .value {
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .timer-container.urgent .value {
        color: var(--error);
      }

      .unit {
        font-size: 0.6rem;
        color: var(--text-muted);
        margin-top: 1px;
      }

      @keyframes pulse {
        from {
          transform: scale(0.98);
        }
        to {
          transform: scale(1.04);
        }
      }
    `,
  ],
})
export class TimerRingComponent {
  @Input() secondsLeft = 30;
  @Input() totalSeconds = 30;

  get strokeOffset(): number {
    const radius = 42;
    const circumference = 2 * Math.PI * radius; // ~263.89
    const progress = Math.max(0, Math.min(1, this.secondsLeft / this.totalSeconds));
    return circumference * (1 - progress);
  }
}
