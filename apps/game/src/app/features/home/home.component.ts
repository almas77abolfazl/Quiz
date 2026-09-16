import { Component, ChangeDetectionStrategy, OnInit, inject, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { PlayerHomeStore } from '../../core/services/player-home.store';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly router = inject(Router);
  readonly playerHomeStore = inject(PlayerHomeStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = this.playerHomeStore.isLoading;
  readonly loadError = this.playerHomeStore.loadError;
  readonly categories = this.playerHomeStore.categories;
  readonly season = this.playerHomeStore.season;
  readonly dailyQuota = this.playerHomeStore.dailyQuota;
  readonly recentSoloGames = this.playerHomeStore.recentSoloGames;

  ngOnInit(): void {
    this.playerHomeStore
      .ensureLoaded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  reloadSummary(): void {
    this.playerHomeStore
      .loadHomeSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  getJalaliMonthName(month?: number): string {
    if (!month) return '';
    const months = [
      '',
      'فروردین',
      'اردیبهشت',
      'خرداد',
      'تیر',
      'مرداد',
      'شهریور',
      'مهر',
      'آبان',
      'آذر',
      'دی',
      'بهمن',
      'اسفند',
    ];
    return months[month] || '';
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fa-IR');
    } catch {
      return isoString;
    }
  }

  quickPlay(): void {
    this.router.navigate(['/quiz']);
  }

  goToQuiz(): void {
    this.router.navigate(['/quiz']);
  }

  goTo1v1(): void {
    this.router.navigate(['/1v1']);
  }

  startQuizWithCategory(catId: string): void {
    this.router.navigate(['/quiz'], { queryParams: { categoryId: catId } });
  }
}
