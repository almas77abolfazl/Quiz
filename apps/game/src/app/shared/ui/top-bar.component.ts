import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CoinBalanceComponent } from './coin-balance.component';
import { SeasonBadgeComponent } from './season-badge.component';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoinBalanceComponent, SeasonBadgeComponent],
})
export class TopBarComponent {
  readonly displayName = input('');
  readonly coins = input(0);
  readonly seasonPoints = input(0);
  readonly seasonRank = input(0);
  readonly dailyStreak = input(0);

  readonly profileClicked = output<void>();
}
