import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizPlayComponent } from './quiz-play.component';
import { SoloQuizApiService } from '../../core/services/solo-quiz-api.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Difficulty, GameStatus, AnswerStatus } from '@quiz/contracts';

describe('QuizPlayComponent (Phase 5D UX Correction)', () => {
  let component: QuizPlayComponent;
  let fixture: ComponentFixture<QuizPlayComponent>;
  let soloQuizApiMock: any;
  let routerMock: any;

  const nowMs = Date.now();
  const deadline30sMs = nowMs + 30000;

  const sampleSession = {
    id: 'session-100',
    userId: 'user-1',
    categoryId: 'cat1',
    difficulty: Difficulty.MEDIUM,
    status: GameStatus.ACTIVE,
    startedAt: new Date(nowMs).toISOString(),
    containsRepeats: false,
    unseenQuestionsRemaining: 5,
    eligibleQuestionCount: 10,
    questions: [
      {
        id: 'sq-1',
        questionId: 'q-10',
        position: 1,
        startsAt: new Date(nowMs).toISOString(),
        deadlineAt: new Date(deadline30sMs).toISOString(),
        question: {
          id: 'q-10',
          text: 'پایتخت ایران کدام است؟',
          difficulty: Difficulty.EASY,
          imageUrl: null,
          categoryIds: ['cat1'],
          options: [
            { id: 'opt-a', text: 'تهران', sortOrder: 1 },
            { id: 'opt-b', text: 'شيراز', sortOrder: 2 },
          ],
        },
      },
      {
        id: 'sq-2',
        questionId: 'q-20',
        position: 2,
        startsAt: null,
        deadlineAt: null,
        question: {
          id: 'q-20',
          text: 'بزرگترین قاره کدام است؟',
          difficulty: Difficulty.MEDIUM,
          imageUrl: null,
          categoryIds: ['cat1'],
          options: [
            { id: 'opt-2a', text: 'آسیا', sortOrder: 1 },
            { id: 'opt-2b', text: 'اروپا', sortOrder: 2 },
          ],
        },
      },
    ],
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    soloQuizApiMock = {
      submitAnswer: vi.fn(),
      advanceQuiz: vi.fn(),
      finishQuiz: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    vi.spyOn(history, 'state', 'get').mockReturnValue({ session: sampleSession });

    await TestBed.configureTestingModule({
      imports: [QuizPlayComponent],
      providers: [
        { provide: SoloQuizApiService, useValue: soloQuizApiMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizPlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('1. Countdown derives from deadlineAt and current time', () => {
    expect(component.secondsLeft()).toBeGreaterThanOrEqual(29);
    expect(component.secondsLeft()).toBeLessThanOrEqual(30);
  });

  it('2. After answer response, automatic advance is triggered in background after 1.5s feedback', () => {
    const mockSubmitRes = {
      status: AnswerStatus.CORRECT,
      isCorrect: true,
      correctOptionId: 'opt-a',
      feedback: {
        questionId: 'q-10',
        selectedOptionId: 'opt-a',
        correctOptionId: 'opt-a',
        isCorrect: true,
        timedOut: false,
        explanation: 'پایتخت ایران تهران است.',
        earnedSeasonPoints: 1,
        earnedCoins: 1,
      },
    };

    const mockAdvanceRes = {
      question: {
        id: 'sq-2',
        questionId: 'q-20',
        position: 2,
        startsAt: new Date().toISOString(),
        deadlineAt: new Date(Date.now() + 30000).toISOString(),
        question: sampleSession.questions[1].question,
      },
      isCompleted: false,
    };

    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockSubmitRes));
    soloQuizApiMock.advanceQuiz.mockReturnValue(of(mockAdvanceRes));

    component.selectOption('opt-a');

    expect(component.answered()).toBe(true);
    expect(soloQuizApiMock.advanceQuiz).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500); // Wait 1.5 seconds feedback window

    expect(soloQuizApiMock.advanceQuiz).toHaveBeenCalledWith('session-100');
    expect(component.currentIndex()).toBe(1);
    expect(component.answered()).toBe(false);
  });

  it('3. Duplicate advance calls are prevented while advance is in progress', () => {
    component.isAdvancing.set(true);

    component.advanceToNextQuestion();

    expect(soloQuizApiMock.advanceQuiz).not.toHaveBeenCalled();
  });

  it('4. Network failure on advance shows advance error banner with retry button', () => {
    soloQuizApiMock.advanceQuiz.mockReturnValue(
      throwError(() => new Error('Advance network error')),
    );

    component.advanceToNextQuestion();

    expect(component.isAdvancing()).toBe(false);
    expect(component.advanceError()).toContain('خطا در دریافت سؤال بعدی');

    const mockAdvanceRes = {
      question: {
        id: 'sq-2',
        questionId: 'q-20',
        position: 2,
        startsAt: new Date().toISOString(),
        deadlineAt: new Date(Date.now() + 30000).toISOString(),
        question: sampleSession.questions[1].question,
      },
      isCompleted: false,
    };
    soloQuizApiMock.advanceQuiz.mockReturnValue(of(mockAdvanceRes));

    // Retry advance
    component.advanceToNextQuestion();

    expect(soloQuizApiMock.advanceQuiz).toHaveBeenCalledTimes(2);
    expect(component.currentIndex()).toBe(1);
    expect(component.advanceError()).toBeNull();
  });

  it('5. Network failure on submission does not freeze/reset deadline, does not mark answer wrong locally, shows retry state', () => {
    soloQuizApiMock.submitAnswer.mockReturnValue(throwError(() => new Error('Network error')));

    component.selectOption('opt-b');

    expect(component.answered()).toBe(false);
    expect(component.isSubmitting()).toBe(false);
    expect(component.submissionError()).toContain('خطا در برقراری ارتباط');
    expect(component.secondsLeft()).toBeGreaterThan(0);
  });

  it('6. Timeout response displays timeout message', () => {
    const mockTimeoutRes = {
      status: AnswerStatus.TIMED_OUT,
      isCorrect: false,
      correctOptionId: 'opt-a',
      feedback: {
        questionId: 'q-10',
        selectedOptionId: 'opt-b',
        correctOptionId: 'opt-a',
        isCorrect: false,
        timedOut: true,
        explanation: null,
        earnedSeasonPoints: 0,
        earnedCoins: 0,
      },
    };

    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockTimeoutRes));

    component.selectOption('opt-b');

    expect(component.answered()).toBe(true);
    expect(component.isAnswerTimedOut()).toBe(true);
    expect(component.isAnswerCorrect()).toBe(false);
  });

  it('7. Final question automatically finishes session exactly once', () => {
    component.currentIndex.set(1); // Set to final question

    const mockSubmitRes = {
      status: AnswerStatus.CORRECT,
      isCorrect: true,
      correctOptionId: 'opt-2a',
      feedback: {
        questionId: 'q-20',
        selectedOptionId: 'opt-2a',
        correctOptionId: 'opt-2a',
        isCorrect: true,
        timedOut: false,
        explanation: null,
        earnedSeasonPoints: 2,
        earnedCoins: 1,
      },
    };

    const mockFinishRes = {
      correctAnswers: 2,
      incorrectAnswers: 0,
      timedOutAnswers: 0,
      totalQuestions: 2,
      coinsEarned: 4,
      seasonPointsEarned: 3,
      isRankedGame: true,
      dailyRankedGamesUsed: 1,
      dailyRankedGamesLimit: 15,
      dailyRankedGamesRemaining: 14,
    };

    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockSubmitRes));
    soloQuizApiMock.finishQuiz.mockReturnValue(of(mockFinishRes));

    component.selectOption('opt-2a');

    expect(soloQuizApiMock.finishQuiz).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500); // 1.5s passes

    expect(soloQuizApiMock.finishQuiz).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/quiz/result'], expect.any(Object));
  });

  it('8. Component destruction cleans up all timers and timeouts', () => {
    const mockSubmitRes = {
      status: AnswerStatus.CORRECT,
      isCorrect: true,
      correctOptionId: 'opt-a',
      feedback: {
        questionId: 'q-10',
        selectedOptionId: 'opt-a',
        correctOptionId: 'opt-a',
        isCorrect: true,
        timedOut: false,
        explanation: null,
        earnedSeasonPoints: 1,
        earnedCoins: 1,
      },
    };

    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockSubmitRes));
    component.selectOption('opt-a');

    // Destroy component before 1.5s
    fixture.destroy();

    vi.advanceTimersByTime(1500);

    expect(soloQuizApiMock.advanceQuiz).not.toHaveBeenCalled();
    expect(soloQuizApiMock.finishQuiz).not.toHaveBeenCalled();
  });

  it('9. Renders repeat notice banner when containsRepeats is true', () => {
    component.quizSession.set({
      ...sampleSession,
      containsRepeats: true,
    });
    fixture.detectChanges();

    const bannerEl = fixture.nativeElement.querySelector('.repeat-notice-banner');
    expect(bannerEl).toBeTruthy();
    expect(bannerEl.textContent).toContain('برخی از سؤالات این کوییز تکراری هستند');
  });
});
