import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { PlayerStore } from '../../core/services/player.store';
import { PlayerHomeSummaryDto } from '@quiz/contracts';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let router: Router;
  let httpMock: HttpTestingController;
  let store: PlayerStore;

  const mockSummary: PlayerHomeSummaryDto = {
    user: {
      id: 'user-77',
      username: 'realhero',
      displayName: 'Real Hero',
      avatarKey: 'avatar-hero',
      coins: 1200,
      dailyStreak: 7,
    },
    season: {
      seasonId: 'season-1',
      jalaliYear: 1405,
      jalaliMonth: 6,
      score: 450,
      rank: 2,
    },
    dailyQuota: {
      used: 1,
      limit: 15,
      remaining: 14,
    },
    categories: [],
    recentSoloGames: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([]), PlayerStore, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    store = TestBed.inject(PlayerStore);
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call ensureLoaded on init and display real user profile, coins, and season badge from PlayerStore', () => {
    fixture.detectChanges(); // triggers ngOnInit -> ensureLoaded

    const req = httpMock.expectOne('/api/users/me/home-summary');
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);

    fixture.detectChanges();

    expect(component.user()).toEqual(mockSummary.user);
    expect(component.seasonPoints()).toBe(450);
    expect(component.seasonRank()).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Real Hero');
    expect(component.user().coins).toBe(1200);
  });

  it('should navigate to profile when profileClicked is invoked', () => {
    component.goToProfile();
    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });
});
