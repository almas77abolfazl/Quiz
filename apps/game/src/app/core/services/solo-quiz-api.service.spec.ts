import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SoloQuizApiService } from './solo-quiz-api.service';
import { Difficulty, GameStatus, AnswerStatus } from '@quiz/contracts';

describe('SoloQuizApiService', () => {
  let service: SoloQuizApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SoloQuizApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SoloQuizApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch categories via GET /api/categories', () => {
    const mockCategories = [
      { id: 'cat1', title: 'علوم', description: null, coverImageUrl: null, isActive: true },
    ];

    service.getCategories().subscribe((res) => {
      expect(res).toEqual(mockCategories);
    });

    const req = httpMock.expectOne('/api/categories');
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
  });

  it('should start a quiz session via POST /api/quiz/start', () => {
    const mockResponse = {
      id: 'session-123',
      userId: 'user-1',
      categoryId: 'cat1',
      difficulty: Difficulty.MEDIUM,
      status: GameStatus.ACTIVE,
      startedAt: new Date().toISOString(),
      questions: [],
      containsRepeats: false,
      unseenQuestionsRemaining: 5,
      eligibleQuestionCount: 10,
    };

    service.startQuiz('cat1', Difficulty.MEDIUM).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/quiz/start');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ categoryId: 'cat1', difficulty: Difficulty.MEDIUM });
    req.flush(mockResponse);
  });

  it('should omit categoryId when ALL is selected', () => {
    service.startQuiz('ALL', Difficulty.HARD).subscribe();

    const req = httpMock.expectOne('/api/quiz/start');
    expect(req.request.body).toEqual({ difficulty: Difficulty.HARD });
    req.flush({});
  });

  it('should submit option ID via POST /api/quiz/:id/answer', () => {
    const mockResponse = {
      status: AnswerStatus.CORRECT,
      isCorrect: true,
      correctOptionId: 'opt1',
      feedback: {
        questionId: 'q1',
        selectedOptionId: 'opt1',
        correctOptionId: 'opt1',
        isCorrect: true,
        timedOut: false,
        explanation: 'درست است',
        earnedSeasonPoints: 10,
        earnedCoins: 10,
      },
    };

    service.submitAnswer('session-123', 'q1', 'opt1').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/quiz/session-123/answer');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ questionId: 'q1', selectedOptionId: 'opt1' });
    req.flush(mockResponse);
  });

  it('should submit timeout without selectedOptionId', () => {
    service.submitAnswer('session-123', 'q1', undefined).subscribe();

    const req = httpMock.expectOne('/api/quiz/session-123/answer');
    expect(req.request.body).toEqual({ questionId: 'q1' });
    req.flush({});
  });

  it('should finish quiz session via POST /api/quiz/:id/finish', () => {
    const mockResponse = {
      correctAnswers: 4,
      incorrectAnswers: 1,
      timedOutAnswers: 0,
      totalQuestions: 5,
      coinsEarned: 90,
      seasonPointsEarned: 8,
      isRankedGame: true,
      dailyRankedGamesUsed: 1,
      dailyRankedGamesLimit: 15,
      dailyRankedGamesRemaining: 14,
    };

    service.finishQuiz('session-123').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/quiz/session-123/finish');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });
});
