import { TestBed } from '@angular/core/testing';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlayerStore } from './player.store';
import { PlayerHomeSummaryDto, PlayerProfileDto, Difficulty } from '@quiz/contracts';

describe('PlayerStore', () => {
  let store: PlayerStore;
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

  const mockProfile: PlayerProfileDto = {
    id: 'usr-1',
    displayName: 'Player One Profile',
    username: 'playerone',
    avatarKey: 'avatar-key-1',
    maskedPhone: '0912***6789',
    coins: 600,
    dailyStreak: 6,
    seasonScore: 180,
    seasonRank: 2,
    stats: {
      totalCompletedSoloGames: 12,
      totalCorrectAnswers: 45,
      totalIncorrectAnswers: 10,
      totalTimedOutAnswers: 5,
      answerAccuracy: 75,
    },
    recentSoloGames: mockSummary.recentSoloGames,
    favoriteCategories: [{ id: 'cat-1', title: 'General', coverKey: null }],
    earnedBadges: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlayerStore, provideHttpClient(), provideHttpClientTesting()],
    });

    store = TestBed.inject(PlayerStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default states', () => {
    expect(store.summary()).toBeNull();
    expect(store.profile()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(store.user().displayName).toBe('بازیکن');
    expect(store.season()).toBeNull();
    expect(store.seasonPoints()).toBe(0);
    expect(store.seasonRank()).toBe(0);
    expect(store.categories()).toEqual([]);
    expect(store.recentSoloGames()).toEqual([]);
    expect(store.stats()).toEqual({
      totalCompletedSoloGames: 0,
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalTimedOutAnswers: 0,
      answerAccuracy: 0,
    });
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
  });

  it('should fetch profile via GET /api/users/me/profile and update profile signals', () => {
    store.loadProfile().subscribe((res) => {
      expect(res).toEqual(mockProfile);
    });

    expect(store.isLoading()).toBe(true);

    const req = httpMock.expectOne('/api/users/me/profile');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);

    expect(store.isLoading()).toBe(false);
    expect(store.profile()).toEqual(mockProfile);
    expect(store.user().displayName).toBe('Player One Profile');
    expect(store.maskedPhone()).toBe('0912***6789');
    expect(store.seasonPoints()).toBe(180);
    expect(store.seasonRank()).toBe(2);
    expect(store.stats()).toEqual(mockProfile.stats);
    expect(store.favoriteCategories()).toEqual(mockProfile.favoriteCategories);
  });

  it('should use single request for concurrent ensureLoaded calls', () => {
    let call1Result: any = null;
    let call2Result: any = null;

    store.ensureLoaded().subscribe((res) => (call1Result = res));
    store.ensureLoaded().subscribe((res) => (call2Result = res));

    const req = httpMock.expectOne('/api/users/me/home-summary');
    req.flush(mockSummary);

    expect(call1Result).toEqual(mockSummary);
    expect(call2Result).toEqual(mockSummary);
  });

  it('should use single request for concurrent ensureProfileLoaded calls', () => {
    let call1Result: any = null;
    let call2Result: any = null;

    store.ensureProfileLoaded().subscribe((res) => (call1Result = res));
    store.ensureProfileLoaded().subscribe((res) => (call2Result = res));

    const req = httpMock.expectOne('/api/users/me/profile');
    req.flush(mockProfile);

    expect(call1Result).toEqual(mockProfile);
    expect(call2Result).toEqual(mockProfile);
  });

  it('should return cached state on subsequent ensureLoaded calls once loaded', () => {
    store.ensureLoaded().subscribe();
    const req = httpMock.expectOne('/api/users/me/home-summary');
    req.flush(mockSummary);

    let subsequentResult: any = null;
    store.ensureLoaded().subscribe((res) => (subsequentResult = res));

    httpMock.expectNone('/api/users/me/home-summary');
    expect(subsequentResult).toEqual(mockSummary);
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
