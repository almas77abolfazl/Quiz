import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-season-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="season-badge">
      <span class="trophy" aria-hidden="true">🏆</span>
      <div class="info">
        <span class="points">{{ points }} امتیاز</span>
        <span *ngIf="rank" class="rank">رتبه {{ rank }}#</span>
      </div>
    </div>
  `,
  styles: [
    `
      .season-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: rgba(99, 102, 241, 0.15);
        border: 1.5px solid rgba(99, 102, 241, 0.4);
        padding: 0.35rem 0.75rem;
        border-radius: var(--radius-full);
        color: #a5b4fc;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .trophy {
        font-size: 1.05rem;
      }
      .info {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .points {
        color: var(--text-main);
        font-weight: 700;
      }
      .rank {
        background: var(--primary-hover);
        color: #ffffff;
        padding: 0.1rem 0.4rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 700;
      }
    `,
  ],
})
export class SeasonBadgeComponent {
  @Input() points = 0;
  @Input() rank?: number;
}
