import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OneVOneComponent } from './1v1.component';
import { MatchStore } from '../../core/services/match.store';
import { GameFacade } from '../../core/data/game.facade';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AnswerStatus } from '@quiz/contracts';

describe('OneVOneComponent', () => {
  let component: OneVOneComponent;
  let fixture: ComponentFixture<OneVOneComponent>;
  let mockMatchStore: any;
  let mockGameFacade: any;
  let router: Router;

  beforeEach(async () => {
    mockMatchStore = {
      phase: signal('idle'),
      connectionState: signal('connected'),
      matchId: signal(null),
      opponent: signal(null),
      totalRounds: signal(5),
      currentRound: signal(0),
      yourScore: signal(0),
      opponentScore: signal(0),
      question: signal(null),
      secondsLeft: signal(30),
      answerSubmissionState: signal('not_submitted'),
      yourSelectedOptionId: signal(null),
      roundResult: signal(null),
      matchEndResult: signal(null),
      opponentOnline: signal(true),
      opponentAnswered: signal(false),
      categoryTitle: signal('عمومی'),
      difficulty: signal('EASY'),
      countdownSeconds: signal(3),
      countdownDeadlineAt: signal(null),
      errorMessage: signal(null),
      isWin: signal(false),
      isLoss: signal(false),
      isDraw: signal(false),

      init: vi.fn(),
      joinMatchmaking: vi.fn(),
      leaveMatchmaking: vi.fn(),
      submitAnswer: vi.fn(),
      reset: vi.fn(),
    };

    mockGameFacade = {
      user: signal({
        id: 'u1',
        displayName: 'بازیکن آزمایشی',
        phone: '09123456789',
        username: 'testplayer',
        avatarKey: 'avatar_1',
        coins: 100,
        seasonPoints: 50,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [OneVOneComponent],
      providers: [
        provideRouter([]),
        { provide: MatchStore, useValue: mockMatchStore },
        { provide: GameFacade, useValue: mockGameFacade },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(OneVOneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and call store.init() on init', () => {
    expect(component).toBeTruthy();
    expect(mockMatchStore.init).toHaveBeenCalled();
  });

  it('should calculate option label correctly in Persian', () => {
    expect(component.getOptionLabel(0)).toBe('الف');
    expect(component.getOptionLabel(1)).toBe('ب');
    expect(component.getOptionLabel(2)).toBe('ج');
    expect(component.getOptionLabel(3)).toBe('د');
  });

  it('should compute option state during active_round', () => {
    mockMatchStore.phase.set('active_round');
    expect(component.getOptionState('opt_1')).toBe('DEFAULT');

    mockMatchStore.yourSelectedOptionId.set('opt_1');
    mockMatchStore.answerSubmissionState.set('submitting');
    expect(component.getOptionState('opt_1')).toBe('SELECTED');
    expect(component.getOptionState('opt_2')).toBe('DISABLED');
  });

  it('should compute option state during round_result', () => {
    mockMatchStore.phase.set('round_result');
    mockMatchStore.roundResult.set({
      matchId: 'm1',
      round: 1,
      correctOptionId: 'opt_1',
      yourScore: 1,
      opponentScore: 0,
      yourStatus: AnswerStatus.CORRECT,
      opponentStatus: AnswerStatus.INCORRECT,
      yourSelectedOptionId: 'opt_1',
      opponentSelectedOptionId: 'opt_2',
    });

    expect(component.getOptionState('opt_1')).toBe('CORRECT');
    expect(component.getOptionState('opt_2')).toBe('DISABLED');
  });

  it('should render real participant names for self and opponent in waiting_for_ready phase', () => {
    mockMatchStore.phase.set('waiting_for_ready');
    mockMatchStore.opponent.set({
      userId: 'opp_123',
      displayName: 'حریف قهرمان',
      username: 'champion',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('بازیکن آزمایشی');
    expect(compiled.textContent).toContain('حریف قهرمان');
  });

  it('should render opponent status as pending vs answered without exposing correctness during active_round', () => {
    mockMatchStore.phase.set('active_round');
    mockMatchStore.opponentAnswered.set(false);
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('حریف هنوز پاسخ نداده');
    expect(compiled.textContent).not.toContain('حریف پاسخ درست داد');

    mockMatchStore.opponentAnswered.set(true);
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('حریف پاسخ داد');
    expect(compiled.textContent).not.toContain('حریف پاسخ درست داد');
  });

  it('should NOT call store.reset() when component is destroyed during an active match', () => {
    mockMatchStore.phase.set('active_round');
    fixture.destroy();
    expect(mockMatchStore.reset).not.toHaveBeenCalled();
  });
});
