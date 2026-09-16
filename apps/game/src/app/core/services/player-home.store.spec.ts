import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlayerHomeStore } from './player-home.store';
import { PlayerHomeSummaryDto, Difficulty } from '@quiz/contracts';

describe('PlayerHomeStore', () => {
  let store: PlayerHomeStore;
  let httpMock: HttpTestingController;

  const mockSummary: PlayerHomeSummaryDto = {
    user: {
      id: 'usr-1',
      username: 'playerone',
      displayName: 'Player One',
      avatarKey: 'avatar-key-1',
      coins: 500,
      dailyStreak: 5,
    },
    season: {
      seasonId: 'season-1',
      jalaliYear: 1405,
      jalaliMonth: 6,
      score: 150,
      rank: 3,
    },
    dailyQuota: {
      used: 2,
      limit: 15,
      remaining: 13,
    },
    categories: [
      {
        id: 'cat-1',
        title: 'General',
        description: 'General knowledge',
        coverKey: null,
        questionCount: 40,
      },
    ],
    recentSoloGames: [
      {
        id: 'session-10',
        categoryId: 'cat-1',
        categoryTitle: 'General',
        difficulty: Difficulty.MEDIUM,
        correctAnswers: 4,
        totalQuestions: 5,
        earnedCoins: 6,
        earnedSeasonPoints: 8,
        completedAt: '2026-09-16T12:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlayerHomeStore, provideHttpClient(), provideHttpClientTesting()],
    });

    store = TestBed.inject(PlayerHomeStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default states', () => {
    expect(store.summary()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(store.user().displayName).toBe('بازیکن');
    expect(store.season()).toBeNull();
    expect(store.seasonPoints()).toBe(0);
    expect(store.seasonRank()).toBe(0);
    expect(store.categories()).toEqual([]);
    expect(store.recentSoloGames()).toEqual([]);
  });

  it('should fetch home summary via GET /api/users/me/home-summary and update signals', () => {
    store.loadHomeSummary().subscribe((res) => {
      expect(res).toEqual(mockSummary);
    });

    expect(store.isLoading()).toBe(true);
    expect(store.loadError()).toBeNull();

    const req = httpMock.expectOne('/api/users/me/home-summary');
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);

    expect(store.isLoading()).toBe(false);
    expect(store.summary()).toEqual(mockSummary);
    expect(store.user()).toEqual(mockSummary.user);
    expect(store.season()).toEqual(mockSummary.season);
    expect(store.seasonPoints()).toBe(150);
    expect(store.seasonRank()).toBe(3);
    expect(store.dailyQuota()).toEqual(mockSummary.dailyQuota);
    expect(store.categories()).toEqual(mockSummary.categories);
    expect(store.recentSoloGames()).toEqual(mockSummary.recentSoloGames);
  });

  it('should handle error when API request fails and set loadError signal', () => {
    let hasError = false;
    store.loadHomeSummary().subscribe({
      next: () => {},
      error: (err) => {
        hasError = true;
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/users/me/home-summary');
    req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    expect(hasError).toBe(true);
    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBe('خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.');
    expect(store.summary()).toBeNull();
  });
});
