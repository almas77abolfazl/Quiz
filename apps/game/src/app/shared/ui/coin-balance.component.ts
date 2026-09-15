import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-coin-balance',
  templateUrl: './coin-balance.component.html',
  styleUrl: './coin-balance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinBalanceComponent {
  readonly amount = input(0);
  readonly showAdd = input(false);
  readonly size = input<'normal' | 'large'>('normal');

  readonly addClicked = output<void>();

  readonly formattedAmount = computed(() => this.amount().toLocaleString('fa-IR'));
}
