import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizResultComponent } from './quiz-result.component';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Difficulty } from '@quiz/contracts';

describe('QuizResultComponent', () => {
  let component: QuizResultComponent;
  let fixture: ComponentFixture<QuizResultComponent>;
  let router: Router;

  const sampleState = {
    correctCount: 4,
    totalQuestions: 5,
    earnedCoins: 90,
    earnedPoints: 40,
    userAnswers: [
      {
        question: {
          id: 'q1',
          text: 'سؤال یک',
          difficulty: Difficulty.EASY,
          imageUrl: null,
          categoryIds: [],
          options: [{ id: 'opt1', text: 'گزینه اول', sortOrder: 1 }],
        },
        selectedOptionId: 'opt1',
        selectedOptionText: 'گزینه اول',
        isCorrect: true,
      },
    ],
  };

  beforeEach(async () => {
    vi.spyOn(history, 'state', 'get').mockReturnValue(sampleState);

    await TestBed.configureTestingModule({
      imports: [QuizResultComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(QuizResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render results from navigation history state', () => {
    expect(component.correctCount()).toBe(4);
    expect(component.totalQuestions()).toBe(5);
    expect(component.earnedCoins()).toBe(90);
    expect(component.earnedPoints()).toBe(40);
    expect(component.isHighPerformance()).toBe(true);
    expect(component.userAnswers().length).toBe(1);
  });

  it('should navigate to /quiz when playAgain is clicked', () => {
    component.playAgain();
    expect(router.navigate).toHaveBeenCalledWith(['/quiz']);
  });

  it('should navigate to home when goHome is clicked', () => {
    component.goHome();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
