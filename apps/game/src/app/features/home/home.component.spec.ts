import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HomeComponent } from './home.component';
import { PlayerStore } from '../../core/services/player.store';
import { PlayerHomeSummaryDto, Difficulty } from '@quiz/contracts';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;
  let httpMock: HttpTestingController;

  const mockSummary: PlayerHomeSummaryDto = {
    user: {
      id: 'usr-1',
      username: 'realuser',
      displayName: 'Real User Name',
      avatarKey: null,
      coins: 350,
      dailyStreak: 2,
    },
    season: {
      seasonId: 'season-10',
      jalaliYear: 1405,
      jalaliMonth: 6,
      score: 80,
      rank: 12,
    },
    dailyQuota: {
      used: 5,
      limit: 15,
      remaining: 10,
    },
    categories: [
      {
        id: 'cat-quiz-1',
        title: 'تاریخ و تمدن',
        description: null,
        coverKey: null,
        questionCount: 15,
      },
    ],
    recentSoloGames: [
      {
        id: 'game-1',
        categoryId: 'cat-quiz-1',
        categoryTitle: 'تاریخ و تmockSummary',
        difficulty: Difficulty.MEDIUM,
        correctAnswers: 5,
        totalQuestions: 5,
        earnedCoins: 7,
        earnedSeasonPoints: 10,
        completedAt: '2026-09-16T14:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), PlayerStore, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call ensureLoaded on init and render real summary data', () => {
    fixture.detectChanges(); // triggers ngOnInit

    const req = httpMock.expectOne('/api/users/me/home-summary');
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);

    fixture.detectChanges();

    expect(component.categories()).toEqual(mockSummary.categories);
    expect(component.season()).toEqual(mockSummary.season);
    expect(component.dailyQuota()).toEqual(mockSummary.dailyQuota);
    expect(component.recentSoloGames()).toEqual(mockSummary.recentSoloGames);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('تاریخ و تمدن');
    expect(compiled.textContent).toContain('Real User Name');
  });

  it('should render empty season and history states when null/empty', () => {
    fixture.detectChanges();

    const emptySummary: PlayerHomeSummaryDto = {
      ...mockSummary,
      season: null,
      recentSoloGames: [],
    };

    const req = httpMock.expectOne('/api/users/me/home-summary');
    req.flush(emptySummary);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('فصلی در حال حاضر فعال نیست');
    expect(compiled.textContent).toContain('هنوز بازی تک‌نفره‌ای انجام نداده‌اید.');
  });

  it('should render error state and retry on click', () => {
    fixture.detectChanges();

    const req1 = httpMock.expectOne('/api/users/me/home-summary');
    req1.flush('Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('خطا در دریافت اطلاعات');

    component.reloadSummary();
    const req2 = httpMock.expectOne('/api/users/me/home-summary');
    req2.flush(mockSummary);
    fixture.detectChanges();

    expect(component.categories().length).toBe(1);
  });

  it('should forward user actions to router', () => {
    component.quickPlay();
    expect(router.navigate).toHaveBeenCalledWith(['/quiz']);

    component.goToQuiz();
    expect(router.navigate).toHaveBeenCalledWith(['/quiz']);

    component.goTo1v1();
    expect(router.navigate).toHaveBeenCalledWith(['/1v1']);

    component.startQuizWithCategory('cat-quiz-1');
    expect(router.navigate).toHaveBeenCalledWith(['/quiz'], {
      queryParams: { categoryId: 'cat-quiz-1' },
    });
  });
});
