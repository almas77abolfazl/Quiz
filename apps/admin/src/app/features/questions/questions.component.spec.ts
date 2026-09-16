import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import {
  Difficulty,
  QuestionStatus,
  PaginatedAdminQuestionsDto,
  AdminQuestionDto,
} from '@quiz/contracts';
import { QuestionsComponent } from './questions.component';
import { AdminApiService, Category } from '../../core/services/admin-api.service';

describe('QuestionsComponent', () => {
  let component: QuestionsComponent;
  let fixture: ComponentFixture<QuestionsComponent>;
  let apiMock: any;

  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      title: 'اطلاعات عمومی',
      description: null,
      coverKey: null,
      isActive: true,
      createdAt: '',
    },
    {
      id: 'cat-2',
      title: 'تاریخ ایران',
      description: null,
      coverKey: null,
      isActive: true,
      createdAt: '',
    },
  ];

  const mockQuestions: AdminQuestionDto[] = [
    {
      id: 'q-1',
      text: 'پایتخت ایران کدام شهر است؟',
      explanation: 'تهران پایتخت ایران است.',
      difficulty: Difficulty.EASY,
      status: QuestionStatus.PUBLISHED,
      imageUrl: null,
      options: [],
      categoryIds: ['cat-1'],
      tagIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'q-2',
      text: 'کوروش بزرگ بنیان‌گذار کدام سلسله بود؟',
      explanation: 'هخامنشیان',
      difficulty: Difficulty.HARD,
      status: QuestionStatus.PENDING_REVIEW,
      imageUrl: null,
      options: [],
      categoryIds: ['cat-2'],
      tagIds: [],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  const mockResponse: PaginatedAdminQuestionsDto = {
    data: mockQuestions,
    meta: {
      page: 1,
      limit: 20,
      total: 80,
      totalPages: 4,
      hasPreviousPage: false,
      hasNextPage: true,
    },
  };

  beforeEach(async () => {
    apiMock = {
      getCategories: vi.fn().mockReturnValue(of(mockCategories)),
      getQuestions: vi.fn().mockReturnValue(of(mockResponse)),
    };

    await TestBed.configureTestingModule({
      imports: [QuestionsComponent],
      providers: [{ provide: AdminApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionsComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load successful list with Persian labels', () => {
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.questions().length).toBe(2);
    expect(component.totalCount()).toBe(80);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('پایتخت ایران کدام شهر است؟');
    expect(compiled.textContent).toContain('آسان');
    expect(compiled.textContent).toContain('منتشرشده');
    expect(compiled.textContent).toContain('سخت');
    expect(compiled.textContent).toContain('در انتظار بررسی');
  });

  it('should render loading state when questions are pending', () => {
    apiMock.getQuestions.mockReturnValue(new Subject());
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('در حال بارگذاری سوالات...');
  });

  it('should render empty state when API returns zero questions', () => {
    apiMock.getQuestions.mockReturnValue(
      of({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      }),
    );
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.questions().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('هیچ سوالی یافت نشد');
  });

  it('should render error state and allow retry when API fails', () => {
    apiMock.getQuestions.mockReturnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).not.toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('خطا در دریافت لیست سوالات');

    apiMock.getQuestions.mockReturnValue(of(mockResponse));
    component.retry();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.questions().length).toBe(2);
  });

  it('should trigger search with 300ms debounce and reset page to 1', () => {
    vi.useFakeTimers();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#search-input') as HTMLInputElement;
    input.value = 'کوروش';
    input.dispatchEvent(new Event('input'));

    expect(apiMock.getQuestions).toHaveBeenCalledTimes(1); // Initial load

    vi.advanceTimersByTime(150);
    expect(apiMock.getQuestions).toHaveBeenCalledTimes(1); // Still debouncing

    vi.advanceTimersByTime(200); // Exceeds 300ms
    expect(apiMock.getQuestions).toHaveBeenCalledTimes(2);
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'کوروش', page: 1 }),
    );
    vi.useRealTimers();
  });

  it('should update category, difficulty, and status filters and reset page to 1', () => {
    fixture.detectChanges();

    component.onCategorySelect({ target: { value: 'cat-2' } } as any);
    expect(component.page()).toBe(1);
    expect(component.categoryId()).toBe('cat-2');
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: 'cat-2', page: 1 }),
    );

    component.onDifficultySelect({ target: { value: Difficulty.HARD } } as any);
    expect(component.difficulty()).toBe(Difficulty.HARD);
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ difficulty: Difficulty.HARD, page: 1 }),
    );

    component.onStatusSelect({ target: { value: QuestionStatus.PUBLISHED } } as any);
    expect(component.status()).toBe(QuestionStatus.PUBLISHED);
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: QuestionStatus.PUBLISHED, page: 1 }),
    );
  });

  it('should reset all filters when clearFilters is called', () => {
    fixture.detectChanges();

    component.search.set('کوروش');
    component.categoryId.set('cat-1');
    component.difficulty.set(Difficulty.EASY);
    component.status.set(QuestionStatus.DRAFT);
    component.page.set(3);

    component.clearFilters();

    expect(component.search()).toBe('');
    expect(component.categoryId()).toBe('');
    expect(component.difficulty()).toBe('');
    expect(component.status()).toBe('');
    expect(component.page()).toBe(1);
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: '',
        categoryId: '',
        difficulty: undefined,
        status: undefined,
        page: 1,
      }),
    );
  });

  it('should navigate pages and preserve active filters', () => {
    fixture.detectChanges();

    component.difficulty.set(Difficulty.EASY);
    component.onPageChange(2);

    expect(component.page()).toBe(2);
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, difficulty: Difficulty.EASY }),
    );
  });

  it('should update limit / page size and reset page to 1', () => {
    fixture.detectChanges();

    component.page.set(3);
    component.onLimitSelect({ target: { value: '50' } } as any);

    expect(component.limit()).toBe(50);
    expect(component.page()).toBe(1);
    expect(apiMock.getQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 50, page: 1 }),
    );
  });

  it('should protect against stale out-of-order API responses', () => {
    const subject1 = new Subject<PaginatedAdminQuestionsDto>();
    const subject2 = new Subject<PaginatedAdminQuestionsDto>();

    apiMock.getQuestions.mockReturnValueOnce(subject1).mockReturnValueOnce(subject2);

    fixture.detectChanges(); // Dispatches request 1

    component.onDifficultySelect({ target: { value: Difficulty.HARD } } as any); // Dispatches request 2

    // Resolve request 2 first
    subject2.next({
      data: [mockQuestions[1]],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    expect(component.questions().length).toBe(1);
    expect(component.questions()[0].id).toBe('q-2');

    // Resolve request 1 later (stale response)
    subject1.next({
      data: mockQuestions,
      meta: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    // The stale response from request 1 must NOT overwrite request 2 data
    expect(component.questions().length).toBe(1);
    expect(component.questions()[0].id).toBe('q-2');
  });
});
