import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import {
  Difficulty,
  QuestionStatus,
  UserRole,
  PaginatedAdminQuestionsDto,
  AdminQuestionDto,
} from '@quiz/contracts';
import { QuestionsComponent } from './questions.component';
import { AdminApiService, Category } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';

describe('QuestionsComponent', () => {
  let component: QuestionsComponent;
  let fixture: ComponentFixture<QuestionsComponent>;
  let apiMock: any;
  let authMock: any;

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
      options: [
        { id: 'opt-1', text: 'شیراز', sortOrder: 1, isCorrect: false },
        { id: 'opt-2', text: 'تهران', sortOrder: 2, isCorrect: true },
        { id: 'opt-3', text: 'اصفهان', sortOrder: 3, isCorrect: false },
        { id: 'opt-4', text: 'تبریز', sortOrder: 4, isCorrect: false },
      ],
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
      status: QuestionStatus.DRAFT,
      imageUrl: null,
      options: [
        { id: 'opt-5', text: 'اشکانیان', sortOrder: 1, isCorrect: false },
        { id: 'opt-6', text: 'ساسانیان', sortOrder: 2, isCorrect: false },
        { id: 'opt-7', text: 'هخامنشیان', sortOrder: 3, isCorrect: true },
        { id: 'opt-8', text: 'مادها', sortOrder: 4, isCorrect: false },
      ],
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
      createQuestion: vi
        .fn()
        .mockImplementation((dto) =>
          of({
            id: 'q-3',
            ...dto,
            status: QuestionStatus.DRAFT,
            createdAt: new Date().toISOString(),
          }),
        ),
      updateQuestion: vi.fn().mockImplementation((id, dto) => of({ ...mockQuestions[1], ...dto })),
      publishQuestion: vi
        .fn()
        .mockImplementation((id) => of({ ...mockQuestions[1], status: QuestionStatus.PUBLISHED })),
    };

    authMock = {
      userRole: vi.fn().mockReturnValue(UserRole.ROOT_ADMIN),
    };

    await TestBed.configureTestingModule({
      imports: [QuestionsComponent],
      providers: [
        { provide: AdminApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionsComponent);
    component = fixture.componentInstance;
  });

  it('1. should initialize and load list with Persian labels', () => {
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.questions().length).toBe(2);
    expect(component.totalCount()).toBe(80);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('پایتخت ایران کدام شهر است؟');
    expect(compiled.textContent).toContain('آسان');
    expect(compiled.textContent).toContain('منتشرشده');
  });

  it('2. should view read-only question details modal', () => {
    fixture.detectChanges();
    component.viewDetails(mockQuestions[0]);
    fixture.detectChanges();

    expect(component.detailsQuestion()?.id).toBe('q-1');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('جزئیات سوال');
    expect(compiled.textContent).toContain('تهران پایتخت ایران است.');
  });

  it('3. should open create modal and validate form requirements', () => {
    fixture.detectChanges();
    component.openCreateModal();
    expect(component.isFormModalOpen()).toBe(true);

    // Try saving empty form
    component.saveQuestion();
    expect(component.formError()).not.toBeNull();

    // Fill valid 4 options and details
    component.questionForm.patchValue({
      text: 'کدام سیاره به سیاره سرخ معروف است؟',
      explanation: 'مریخ به علت وجود اکسید آهن سرخ‌رنگ دیده می‌شود.',
      difficulty: Difficulty.EASY,
      categoryIds: ['cat-1'],
      correctOptionIndex: 1,
    });
    const optsArray = component.optionsFormArray;
    optsArray.at(0).patchValue({ text: 'زهره' });
    optsArray.at(1).patchValue({ text: 'مریخ' });
    optsArray.at(2).patchValue({ text: 'مشتری' });
    optsArray.at(3).patchValue({ text: 'زحل' });

    component.saveQuestion(QuestionStatus.DRAFT);

    expect(apiMock.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'کدام سیاره به سیاره سرخ معروف است؟',
        categoryIds: ['cat-1'],
        questionOptions: expect.arrayContaining([
          expect.objectContaining({ text: 'مریخ', isCorrect: true }),
        ]),
      }),
    );
  });

  it('4. should restrict edit for Content Specialist on Published questions', () => {
    authMock.userRole.mockReturnValue(UserRole.CONTENT_SPECIALIST);
    fixture.detectChanges();

    // Published question cannot be edited by Content Specialist
    expect(component.canEditQuestion(mockQuestions[0])).toBe(false);
    // Draft question can be edited by Content Specialist
    expect(component.canEditQuestion(mockQuestions[1])).toBe(true);
  });

  it('5. should allow Root Admin to publish question directly', () => {
    authMock.userRole.mockReturnValue(UserRole.ROOT_ADMIN);
    fixture.detectChanges();

    expect(component.canPublishQuestion(mockQuestions[1])).toBe(true);
    component.publishQuestion(mockQuestions[1]);

    expect(apiMock.publishQuestion).toHaveBeenCalledWith('q-2');
  });

  it('6. should submit draft for review', () => {
    fixture.detectChanges();

    component.submitForReview(mockQuestions[1]);

    expect(apiMock.updateQuestion).toHaveBeenCalledWith('q-2', {
      status: QuestionStatus.PENDING_REVIEW,
    });
  });

  it('7. should protect against stale out-of-order responses', () => {
    const subject1 = new Subject<PaginatedAdminQuestionsDto>();
    const subject2 = new Subject<PaginatedAdminQuestionsDto>();

    apiMock.getQuestions.mockReturnValueOnce(subject1).mockReturnValueOnce(subject2);

    fixture.detectChanges(); // Req 1

    component.onDifficultySelect({ target: { value: Difficulty.HARD } } as any); // Req 2

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

    expect(component.questions()[0].id).toBe('q-2');

    // Stale response from Req 1 arrives later
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

    // Should remain q-2
    expect(component.questions()[0].id).toBe('q-2');
  });
});
