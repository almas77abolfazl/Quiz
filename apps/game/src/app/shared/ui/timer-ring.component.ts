import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

@Component({
  selector: 'app-timer-ring',
  templateUrl: './timer-ring.component.html',
  styleUrl: './timer-ring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerRingComponent {
  readonly secondsLeft = input(30);
  readonly totalSeconds = input(30);

  readonly isUrgent = computed(() => this.secondsLeft() <= 5);

  readonly formattedSeconds = computed(() => this.secondsLeft().toLocaleString('fa-IR'));

  readonly strokeOffset = computed(() => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius; // ~263.89
    const total = Math.max(1, this.totalSeconds());
    const progress = Math.max(0, Math.min(1, this.secondsLeft() / total));
    return circumference * (1 - progress);
  });
}
