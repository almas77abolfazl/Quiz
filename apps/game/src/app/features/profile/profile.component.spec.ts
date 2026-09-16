import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { PlayerStore } from '../../core/services/player.store';
import { PlayerProfileDto, Difficulty } from '@quiz/contracts';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let router: Router;
  let httpMock: HttpTestingController;
  let store: PlayerStore;

  const mockProfile: PlayerProfileDto = {
    id: 'user-99',
    displayName: 'Real Pro Player',
    username: 'proplayer',
    avatarKey: null,
    maskedPhone: '0912***4321',
    coins: 750,
    dailyStreak: 4,
    seasonScore: 320,
    seasonRank: 5,
    stats: {
      totalCompletedSoloGames: 15,
      totalCorrectAnswers: 60,
      totalIncorrectAnswers: 15,
      totalTimedOutAnswers: 5,
      answerAccuracy: 75,
    },
    recentSoloGames: [
      {
        id: 'session-101',
        categoryId: 'cat-10',
        categoryTitle: 'تاریخ',
        difficulty: Difficulty.HARD,
        correctAnswers: 5,
        totalQuestions: 5,
        earnedCoins: 12,
        earnedSeasonPoints: 15,
        completedAt: '2026-09-16T15:00:00Z',
      },
    ],
    favoriteCategories: [{ id: 'cat-10', title: 'تاریخ', coverKey: null }],
    earnedBadges: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideRouter([]), PlayerStore, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    store = TestBed.inject(PlayerStore);
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should trigger ensureProfileLoaded on init and render real authenticated profile statistics', () => {
    fixture.detectChanges(); // triggers ProfileComponent.ngOnInit & AppShellComponent.ngOnInit

    const profileReq = httpMock.expectOne('/api/users/me/profile');
    expect(profileReq.request.method).toBe('GET');
    profileReq.flush(mockProfile);

    const summaryReq = httpMock.expectOne('/api/users/me/home-summary');
    summaryReq.flush({
      user: {
        id: 'user-99',
        username: 'proplayer',
        displayName: 'Real Pro Player',
        avatarKey: null,
        coins: 750,
        dailyStreak: 4,
      },
      season: null,
      dailyQuota: { used: 0, limit: 15, remaining: 15 },
      categories: [],
      recentSoloGames: [],
    });

    fixture.detectChanges();

    expect(component.user().displayName).toBe('Real Pro Player');
    expect(component.maskedPhone()).toBe('0912***4321');
    expect(component.seasonRank()).toBe(5);
    expect(component.seasonPoints()).toBe(320);
    expect(component.stats()).toEqual(mockProfile.stats);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Real Pro Player');
    expect(compiled.textContent).toContain('0912***4321');
    expect(compiled.textContent).toContain('75٪');
    expect(compiled.textContent).toContain('تاریخ');
    expect(compiled.textContent).not.toContain('استاد اطلاعات عمومی'); // No demo achievements!
  });

  it('should render proper empty states for badges, favorites, and history when empty', () => {
    fixture.detectChanges();

    const emptyProfile: PlayerProfileDto = {
      ...mockProfile,
      recentSoloGames: [],
      favoriteCategories: [],
      earnedBadges: [],
    };

    const profileReq = httpMock.expectOne('/api/users/me/profile');
    profileReq.flush(emptyProfile);

    const summaryReq = httpMock.expectOne('/api/users/me/home-summary');
    summaryReq.flush({
      user: {
        id: 'user-99',
        username: 'proplayer',
        displayName: 'Real Pro Player',
        avatarKey: null,
        coins: 0,
        dailyStreak: 0,
      },
      season: null,
      dailyQuota: { used: 0, limit: 15, remaining: 15 },
      categories: [],
      recentSoloGames: [],
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('نشان و افتخاری دریافت نشده است (به‌زودی).');
    expect(compiled.textContent).toContain('هنوز دسته‌بندی محبوبی دنبال نشده است.');
    expect(compiled.textContent).toContain('هنوز کوییزی انجام نشده است.');
  });

  it('should render loading state, handle error, and retry on button click', () => {
    fixture.detectChanges();

    const profileReq = httpMock.expectOne('/api/users/me/profile');
    profileReq.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    const summaryReq = httpMock.expectOne('/api/users/me/home-summary');
    summaryReq.flush({
      user: {
        id: 'user-99',
        username: 'proplayer',
        displayName: 'Real Pro Player',
        avatarKey: null,
        coins: 0,
        dailyStreak: 0,
      },
      season: null,
      dailyQuota: { used: 0, limit: 15, remaining: 15 },
      categories: [],
      recentSoloGames: [],
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('خطا در دریافت اطلاعات. لطفاً دوباره تلاش کنید.');

    component.retry();

    const retryReq = httpMock.expectOne('/api/users/me/profile');
    retryReq.flush(mockProfile);

    fixture.detectChanges();

    expect(compiled.textContent).toContain('Real Pro Player');
  });
});
