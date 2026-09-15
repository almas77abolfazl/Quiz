import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

@Component({
  selector: 'app-season-badge',
  templateUrl: './season-badge.component.html',
  styleUrl: './season-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeasonBadgeComponent {
  readonly points = input(0);
  readonly rank = input<number | undefined>(undefined);

  readonly formattedPoints = computed(() => this.points().toLocaleString('fa-IR'));
}
