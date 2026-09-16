import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError, of } from 'rxjs';
import {
  PlayerHomeSummaryDto,
  PlayerHomeSummaryUserDto,
  PlayerHomeSummarySeasonDto,
  PlayerHomeSummaryDailyQuotaDto,
  PlayerHomeSummaryCategoryDto,
  PlayerHomeRecentGameDto,
} from '@quiz/contracts';

const DEFAULT_USER: PlayerHomeSummaryUserDto = {
  id: '',
  username: null,
  displayName: 'بازیکن',
  avatarKey: null,
  coins: 0,
  dailyStreak: 0,
};

const DEFAULT_QUOTA: PlayerHomeSummaryDailyQuotaDto = {
  used: 0,
  limit: 15,
  remaining: 15,
};

@Injectable({ providedIn: 'root' })
export class PlayerHomeStore {
  private readonly http = inject(HttpClient);

  private readonly summaryState = signal<PlayerHomeSummaryDto | null>(null);
  private readonly loadingState = signal<boolean>(false);
  private readonly errorState = signal<string | null>(null);

  readonly summary = this.summaryState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly loadError = this.errorState.asReadonly();

  readonly user = computed<PlayerHomeSummaryUserDto>(
    () => this.summaryState()?.user ?? DEFAULT_USER,
  );

  readonly season = computed<PlayerHomeSummarySeasonDto | null>(
    () => this.summaryState()?.season ?? null,
  );

  readonly seasonPoints = computed<number>(() => this.summaryState()?.season?.score ?? 0);

  readonly seasonRank = computed<number>(() => this.summaryState()?.season?.rank ?? 0);

  readonly dailyQuota = computed<PlayerHomeSummaryDailyQuotaDto>(
    () => this.summaryState()?.dailyQuota ?? DEFAULT_QUOTA,
  );

  readonly categories = computed<readonly PlayerHomeSummaryCategoryDto[]>(
    () => this.summaryState()?.categories ?? [],
  );

  readonly recentSoloGames = computed<readonly PlayerHomeRecentGameDto[]>(
    () => this.summaryState()?.recentSoloGames ?? [],
  );

  ensureLoaded(): Observable<PlayerHomeSummaryDto | null> {
    if (this.summaryState() || this.loadingState()) {
      return of(this.summaryState());
    }
    return this.loadHomeSummary();
  }

  loadHomeSummary(): Observable<PlayerHomeSummaryDto> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.http.get<PlayerHomeSummaryDto>('/api/users/me/home-summary').pipe(
      tap((data) => {
        this.summaryState.set(data);
        this.loadingState.set(false);
        this.errorState.set(null);
      }),
      catchError((err) => {
        this.loadingState.set(false);
        this.errorState.set('خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.');
        return throwError(() => err);
      }),
    );
  }

  refresh(): Observable<PlayerHomeSummaryDto> {
    return this.loadHomeSummary();
  }
}
