import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, shareReplay } from 'rxjs/operators';
import { Observable, throwError, of } from 'rxjs';
import {
  PlayerHomeSummaryDto,
  PlayerHomeSummaryUserDto,
  PlayerHomeSummarySeasonDto,
  PlayerHomeSummaryDailyQuotaDto,
  PlayerHomeSummaryCategoryDto,
  PlayerHomeRecentGameDto,
  PlayerProfileDto,
  PlayerProfileStatsDto,
  PlayerProfileFavoriteCategoryDto,
  PlayerProfileBadgeDto,
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

const DEFAULT_STATS: PlayerProfileStatsDto = {
  totalCompletedSoloGames: 0,
  totalCorrectAnswers: 0,
  totalIncorrectAnswers: 0,
  totalTimedOutAnswers: 0,
  answerAccuracy: 0,
};

@Injectable({ providedIn: 'root' })
export class PlayerStore {
  private readonly http = inject(HttpClient);

  private readonly summaryState = signal<PlayerHomeSummaryDto | null>(null);
  private readonly profileState = signal<PlayerProfileDto | null>(null);

  private readonly summaryLoadingState = signal<boolean>(false);
  private readonly summaryErrorState = signal<string | null>(null);

  private readonly profileLoadingState = signal<boolean>(false);
  private readonly profileErrorState = signal<string | null>(null);

  private summaryInFlight$: Observable<PlayerHomeSummaryDto> | null = null;
  private profileInFlight$: Observable<PlayerProfileDto> | null = null;

  readonly summary = this.summaryState.asReadonly();
  readonly profile = this.profileState.asReadonly();

  readonly isLoading = computed(() => this.summaryLoadingState() || this.profileLoadingState());

  readonly loadError = computed(() => this.profileErrorState() || this.summaryErrorState());

  readonly user = computed<PlayerHomeSummaryUserDto>(() => {
    if (this.profileState()) {
      const p = this.profileState()!;
      return {
        id: p.id,
        phone: p.maskedPhone,
        username: p.username,
        displayName: p.displayName ?? 'بازیکن',
        avatarKey: p.avatarKey,
        coins: p.coins,
        dailyStreak: p.dailyStreak,
      };
    }
    return this.summaryState()?.user ?? DEFAULT_USER;
  });

  readonly maskedPhone = computed<string>(() => {
    if (this.profileState()) {
      return this.profileState()!.maskedPhone;
    }
    if (this.summaryState()?.user?.phone) {
      return this.maskPhone(this.summaryState()!.user.phone!);
    }
    return '';
  });

  readonly season = computed<PlayerHomeSummarySeasonDto | null>(
    () => this.summaryState()?.season ?? null,
  );

  readonly seasonPoints = computed<number>(() => {
    if (this.profileState() !== null) {
      return this.profileState()!.seasonScore;
    }
    return this.summaryState()?.season?.score ?? 0;
  });

  readonly seasonRank = computed<number>(() => {
    if (this.profileState() !== null) {
      return this.profileState()!.seasonRank ?? 0;
    }
    return this.summaryState()?.season?.rank ?? 0;
  });

  readonly dailyQuota = computed<PlayerHomeSummaryDailyQuotaDto>(
    () => this.summaryState()?.dailyQuota ?? DEFAULT_QUOTA,
  );

  readonly categories = computed<readonly PlayerHomeSummaryCategoryDto[]>(
    () => this.summaryState()?.categories ?? [],
  );

  readonly recentSoloGames = computed<readonly PlayerHomeRecentGameDto[]>(() => {
    if (this.profileState() !== null) {
      return this.profileState()!.recentSoloGames;
    }
    return this.summaryState()?.recentSoloGames ?? [];
  });

  readonly stats = computed<PlayerProfileStatsDto>(
    () => this.profileState()?.stats ?? DEFAULT_STATS,
  );

  readonly favoriteCategories = computed<readonly PlayerProfileFavoriteCategoryDto[]>(
    () => this.profileState()?.favoriteCategories ?? [],
  );

  readonly earnedBadges = computed<readonly PlayerProfileBadgeDto[]>(
    () => this.profileState()?.earnedBadges ?? [],
  );

  ensureLoaded(): Observable<PlayerHomeSummaryDto | null> {
    if (this.summaryState()) {
      return of(this.summaryState());
    }
    if (this.summaryInFlight$) {
      return this.summaryInFlight$;
    }
    return this.loadHomeSummary();
  }

  loadHomeSummary(): Observable<PlayerHomeSummaryDto> {
    if (this.summaryInFlight$) {
      return this.summaryInFlight$;
    }
    this.summaryLoadingState.set(true);
    this.summaryErrorState.set(null);

    this.summaryInFlight$ = this.http.get<PlayerHomeSummaryDto>('/api/users/me/home-summary').pipe(
      tap((data) => {
        this.summaryState.set(data);
        this.summaryLoadingState.set(false);
        this.summaryErrorState.set(null);
        this.summaryInFlight$ = null;
      }),
      catchError((err) => {
        this.summaryLoadingState.set(false);
        this.summaryErrorState.set('خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.');
        this.summaryInFlight$ = null;
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    return this.summaryInFlight$;
  }

  load(): Observable<PlayerHomeSummaryDto> {
    return this.loadHomeSummary();
  }

  ensureProfileLoaded(): Observable<PlayerProfileDto | null> {
    if (this.profileState()) {
      return of(this.profileState());
    }
    if (this.profileInFlight$) {
      return this.profileInFlight$;
    }
    return this.loadProfile();
  }

  loadProfile(): Observable<PlayerProfileDto> {
    if (this.profileInFlight$) {
      return this.profileInFlight$;
    }
    this.profileLoadingState.set(true);
    this.profileErrorState.set(null);

    this.profileInFlight$ = this.http.get<PlayerProfileDto>('/api/users/me/profile').pipe(
      tap((data) => {
        this.profileState.set(data);
        this.profileLoadingState.set(false);
        this.profileErrorState.set(null);
        this.profileInFlight$ = null;
      }),
      catchError((err) => {
        this.profileLoadingState.set(false);
        this.profileErrorState.set('خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.');
        this.profileInFlight$ = null;
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    return this.profileInFlight$;
  }

  refresh(): Observable<PlayerHomeSummaryDto> {
    this.summaryState.set(null);
    this.profileState.set(null);
    return this.loadHomeSummary();
  }

  refreshProfile(): Observable<PlayerProfileDto> {
    this.profileState.set(null);
    return this.loadProfile();
  }

  private maskPhone(phone: string): string {
    if (!phone) return '';
    if (phone.length <= 6) return phone;
    return phone.slice(0, 4) + '***' + phone.slice(-4);
  }
}
