import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizPlayComponent } from './quiz-play.component';
import { SoloQuizApiService } from '../../core/services/solo-quiz-api.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Difficulty, GameStatus, AnswerStatus } from '@quiz/contracts';

describe('QuizPlayComponent', () => {
  let component: QuizPlayComponent;
  let fixture: ComponentFixture<QuizPlayComponent>;
  let soloQuizApiMock: any;
  let routerMock: any;

  const sampleSession = {
    id: 'session-100',
    userId: 'user-1',
    categoryId: 'cat1',
    difficulty: Difficulty.MEDIUM,
    status: GameStatus.ACTIVE,
    startedAt: new Date().toISOString(),
    questions: [
      {
        id: 'sq-1',
        questionId: 'q-10',
        position: 1,
        startsAt: new Date().toISOString(),
        deadlineAt: new Date().toISOString(),
        question: {
          id: 'q-10',
          text: 'پایتخت ایران کدام است؟',
          difficulty: Difficulty.EASY,
          imageUrl: null,
          categoryIds: ['cat1'],
          options: [
            { id: 'opt-a', text: 'تهران', sortOrder: 1 },
            { id: 'opt-b', text: 'شيراز', sortOrder: 2 },
            { id: 'opt-c', text: 'اصفهان', sortOrder: 3 },
            { id: 'opt-d', text: 'تبریز', sortOrder: 4 },
          ],
        },
      },
      {
        id: 'sq-2',
        questionId: 'q-20',
        position: 2,
        startsAt: new Date().toISOString(),
        deadlineAt: new Date().toISOString(),
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
    soloQuizApiMock = {
      submitAnswer: vi.fn(),
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

  it('1. Safe payload rendering: should render player-safe question without correct answer keys before submission', () => {
    expect(component.currentQuestion()).toBeTruthy();
    expect(component.currentQuestion()?.text).toBe('پایتخت ایران کدام است؟');

    // Verify option objects do not contain isCorrect key
    const options = component.currentQuestion()?.options || [];
    options.forEach((opt: any) => {
      expect(opt.isCorrect).toBeUndefined();
    });

    // Before submission, answered state and correctOptionId are null
    expect(component.answered()).toBe(false);
    expect(component.correctOptionId()).toBeNull();
  });

  it('2. Correct/incorrect answers: should reveal correctness and correct option ONLY after API response', () => {
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
        earnedSeasonPoints: 10,
        earnedCoins: 10,
      },
    };

    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockSubmitRes));

    // Submit answer
    component.selectOption('opt-a');

    expect(soloQuizApiMock.submitAnswer).toHaveBeenCalledWith('session-100', 'q-10', 'opt-a');
    expect(component.answered()).toBe(true);
    expect(component.isAnswerCorrect()).toBe(true);
    expect(component.correctOptionId()).toBe('opt-a');
    expect(component.getOptionState('opt-a')).toBe('CORRECT');
  });

  it('3. Timeout: should submit timeout according to API contract (undefined optionId)', () => {
    const mockTimeoutRes = {
      status: AnswerStatus.TIMED_OUT,
      isCorrect: false,
      correctOptionId: 'opt-a',
      feedback: {
        questionId: 'q-10',
        selectedOptionId: null,
        correctOptionId: 'opt-a',
        isCorrect: false,
        timedOut: true,
        explanation: null,
        earnedSeasonPoints: 0,
        earnedCoins: 0,
      },
    };

    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockTimeoutRes));

    // Trigger timeout manually
    (component as any).handleTimeout();

    expect(soloQuizApiMock.submitAnswer).toHaveBeenCalledWith('session-100', 'q-10', undefined);
    expect(component.answered()).toBe(true);
    expect(component.isAnswerCorrect()).toBe(false);
    expect(component.correctOptionId()).toBe('opt-a');
  });

  it('4. Failed submission retry: network failure must not count as wrong or advance, shows retry', () => {
    soloQuizApiMock.submitAnswer.mockReturnValue(throwError(() => new Error('Network error')));

    component.selectOption('opt-b');

    // Must NOT be marked as answered or wrong
    expect(component.answered()).toBe(false);
    expect(component.isSubmitting()).toBe(false);
    expect(component.submissionError()).toContain('خطا در برقراری ارتباط');

    // Retry submission succeeds
    const mockSubmitRes = {
      status: AnswerStatus.INCORRECT,
      isCorrect: false,
      correctOptionId: 'opt-a',
      feedback: {
        questionId: 'q-10',
        selectedOptionId: 'opt-b',
        correctOptionId: 'opt-a',
        isCorrect: false,
        timedOut: false,
        explanation: null,
        earnedSeasonPoints: 0,
        earnedCoins: 0,
      },
    };
    soloQuizApiMock.submitAnswer.mockReturnValue(of(mockSubmitRes));

    component.retrySubmit();

    expect(soloQuizApiMock.submitAnswer).toHaveBeenCalledTimes(2);
    expect(component.answered()).toBe(true);
    expect(component.submissionError()).toBeNull();
  });

  it('5. Finish session: should call finish endpoint and navigate to result using authoritative API values', () => {
    const mockFinishRes = {
      correctAnswers: 2,
      incorrectAnswers: 0,
      timedOutAnswers: 0,
      totalQuestions: 2,
      coinsEarned: 4,
      seasonPointsEarned: 3,
    };

    soloQuizApiMock.finishQuiz.mockReturnValue(of(mockFinishRes));

    component.finishGameSession();

    expect(soloQuizApiMock.finishQuiz).toHaveBeenCalledWith('session-100');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/quiz/result'], {
      state: {
        correctCount: 2,
        incorrectCount: 0,
        timedOutCount: 0,
        totalQuestions: 2,
        earnedCoins: 4,
        earnedPoints: 3, // authoritative seasonPointsEarned from API (not 2 * 10)
        userAnswers: component.userAnswers(),
      },
    });
  });
});
