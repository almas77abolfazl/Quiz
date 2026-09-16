import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizSetupComponent } from './quiz-setup.component';
import { SoloQuizApiService } from '../../core/services/solo-quiz-api.service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { Difficulty, GameStatus } from '@quiz/contracts';

describe('QuizSetupComponent', () => {
  let component: QuizSetupComponent;
  let fixture: ComponentFixture<QuizSetupComponent>;
  let soloQuizApiMock: any;
  let router: Router;

  beforeEach(async () => {
    soloQuizApiMock = {
      getCategories: vi
        .fn()
        .mockReturnValue(
          of([
            { id: 'cat1', title: 'تاریخ', description: null, coverImageUrl: null, isActive: true },
          ]),
        ),
      startQuiz: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [QuizSetupComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SoloQuizApiService, useValue: soloQuizApiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ categoryId: 'cat1' }),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(QuizSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load categories on init', () => {
    expect(component).toBeTruthy();
    expect(soloQuizApiMock.getCategories).toHaveBeenCalled();
    expect(component.apiCategories().length).toBe(1);
    expect(component.selectedCategoryId()).toBe('cat1');
  });

  it('should call startQuiz on API and navigate to play on success', () => {
    const mockSession = {
      id: 'session-999',
      userId: 'user-1',
      categoryId: 'cat1',
      difficulty: Difficulty.MEDIUM,
      status: GameStatus.ACTIVE,
      startedAt: new Date().toISOString(),
      questions: [],
    };

    soloQuizApiMock.startQuiz.mockReturnValue(of(mockSession));

    component.startQuiz();

    expect(soloQuizApiMock.startQuiz).toHaveBeenCalledWith('cat1', Difficulty.MEDIUM);
    expect(router.navigate).toHaveBeenCalledWith(['/quiz/play'], {
      state: { session: mockSession },
    });
  });

  it('should display error message on empty session or API error', () => {
    soloQuizApiMock.startQuiz.mockReturnValue(
      throwError(() => ({ status: 400, error: { message: 'No questions available' } })),
    );

    component.startQuiz();

    expect(component.errorMessage()).toContain('سؤالی برای این دسته و سطح سختی یافت نشد');
    expect(component.loading()).toBe(false);
  });
});
