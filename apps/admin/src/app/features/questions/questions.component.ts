import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminQuestionDto,
  QuestionPaginationMetaDto,
  Difficulty,
  QuestionStatus,
  UserRole,
} from '@quiz/contracts';
import { AdminApiService, Category } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // User Role State
  readonly userRole = this.authService.userRole;
  readonly isRootAdmin = computed(() => this.userRole() === UserRole.ROOT_ADMIN);
  readonly isContentSpecialist = computed(() => this.userRole() === UserRole.CONTENT_SPECIALIST);
  readonly QuestionStatus = QuestionStatus;

  // Filter & Pagination Signals
  readonly page = signal<number>(1);
  readonly limit = signal<number>(20);
  readonly search = signal<string>('');
  readonly searchInput = signal<string>('');
  readonly categoryId = signal<string>('');
  readonly difficulty = signal<Difficulty | ''>('');
  readonly status = signal<QuestionStatus | ''>('');

  // Data & State Signals
  readonly questions = signal<AdminQuestionDto[]>([]);
  readonly meta = signal<QuestionPaginationMetaDto | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Details Modal State
  readonly detailsQuestion = signal<AdminQuestionDto | null>(null);

  // Create / Edit Form Modal State
  readonly isFormModalOpen = signal<boolean>(false);
  readonly editingQuestion = signal<AdminQuestionDto | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  // Form definition
  questionForm: FormGroup = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    explanation: ['', [Validators.required, Validators.minLength(5)]],
    difficulty: [Difficulty.EASY, [Validators.required]],
    imageKey: [''],
    categoryIds: [[], [Validators.required]],
    correctOptionIndex: [0, [Validators.required]],
    options: this.fb.array([
      this.fb.group({ text: ['', Validators.required] }),
      this.fb.group({ text: ['', Validators.required] }),
      this.fb.group({ text: ['', Validators.required] }),
      this.fb.group({ text: ['', Validators.required] }),
    ]),
  });

  // Stale request tracking counter
  private requestId = 0;
  private searchDebounceTimer: any = null;

  // Computed State
  readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c.title])));
  readonly hasActiveFilters = computed(
    () => !!this.search() || !!this.categoryId() || !!this.difficulty() || !!this.status(),
  );
  readonly totalCount = computed(() => this.meta()?.total ?? 0);
  readonly totalPages = computed(() => this.meta()?.totalPages ?? 0);
  readonly hasPreviousPage = computed(() => this.meta()?.hasPreviousPage ?? false);
  readonly hasNextPage = computed(() => this.meta()?.hasNextPage ?? false);

  // Persian Labels mapping
  readonly difficultyOptions = [
    { value: Difficulty.EASY, label: 'آسان' },
    { value: Difficulty.MEDIUM, label: 'متوسط' },
    { value: Difficulty.HARD, label: 'سخت' },
    { value: Difficulty.VERY_HARD, label: 'خیلی سخت' },
  ];

  readonly statusOptions = [
    { value: QuestionStatus.DRAFT, label: 'پیشنویس' },
    { value: QuestionStatus.PENDING_REVIEW, label: 'در انتظار بررسی' },
    { value: QuestionStatus.PUBLISHED, label: 'منتشرشده' },
    { value: QuestionStatus.ARCHIVED, label: 'بایگانیشده' },
  ];

  readonly difficultyLabels: Record<Difficulty, string> = {
    [Difficulty.EASY]: 'آسان',
    [Difficulty.MEDIUM]: 'متوسط',
    [Difficulty.HARD]: 'سخت',
    [Difficulty.VERY_HARD]: 'خیلی سخت',
  };

  readonly statusLabels: Record<QuestionStatus, string> = {
    [QuestionStatus.DRAFT]: 'پیشنویس',
    [QuestionStatus.PENDING_REVIEW]: 'در انتظار بررسی',
    [QuestionStatus.PUBLISHED]: 'منتشرشده',
    [QuestionStatus.ARCHIVED]: 'بایگانیشده',
  };

  get optionsFormArray(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadQuestions();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (data) => this.categories.set(data),
      error: () => {},
    });
  }

  loadQuestions(): void {
    const currentReqId = ++this.requestId;
    this.isLoading.set(true);
    this.error.set(null);

    this.api
      .getQuestions({
        page: this.page(),
        limit: this.limit(),
        search: this.search(),
        categoryId: this.categoryId(),
        difficulty: this.difficulty() || undefined,
        status: this.status() || undefined,
      })
      .subscribe({
        next: (res) => {
          if (currentReqId !== this.requestId) {
            return;
          }
          this.questions.set(res.data as AdminQuestionDto[]);
          this.meta.set(res.meta);
          this.isLoading.set(false);
        },
        error: () => {
          if (currentReqId !== this.requestId) {
            return;
          }
          this.error.set('خطا در دریافت لیست سوالات. لطفاً دوباره تلاش کنید.');
          this.isLoading.set(false);
        },
      });
  }

  // Permission Checks
  canEditQuestion(q: AdminQuestionDto): boolean {
    if (this.isRootAdmin()) return true;
    if (this.isContentSpecialist()) {
      return q.status === QuestionStatus.DRAFT || q.status === QuestionStatus.PENDING_REVIEW;
    }
    return false;
  }

  canPublishQuestion(q: AdminQuestionDto): boolean {
    return (
      this.isRootAdmin() &&
      (q.status === QuestionStatus.DRAFT || q.status === QuestionStatus.PENDING_REVIEW)
    );
  }

  canSubmitForReview(q: AdminQuestionDto): boolean {
    return q.status === QuestionStatus.DRAFT;
  }

  // Details Modal
  viewDetails(q: AdminQuestionDto): void {
    this.detailsQuestion.set(q);
  }

  closeDetails(): void {
    this.detailsQuestion.set(null);
  }

  // Create / Edit Form Modal
  openCreateModal(): void {
    this.editingQuestion.set(null);
    this.formError.set(null);

    const defaultCategory = this.categories().length > 0 ? [this.categories()[0].id] : [];

    this.questionForm.reset({
      text: '',
      explanation: '',
      difficulty: Difficulty.EASY,
      imageKey: '',
      categoryIds: defaultCategory,
      correctOptionIndex: 0,
    });

    const opts = this.optionsFormArray;
    for (let i = 0; i < 4; i++) {
      opts.at(i).patchValue({ text: '' });
    }

    this.isFormModalOpen.set(true);
  }

  openEditModal(q: AdminQuestionDto): void {
    if (!this.canEditQuestion(q)) {
      this.showSuccess('ویرایش سوالات منتشرشده تنها توسط مدیر ارشد امکان‌پذیر است.');
      return;
    }

    this.editingQuestion.set(q);
    this.formError.set(null);

    const correctIndex = q.options.findIndex((opt) => opt.isCorrect);

    this.questionForm.patchValue({
      text: q.text,
      explanation: q.explanation || '',
      difficulty: q.difficulty,
      imageKey: q.imageUrl || '',
      categoryIds: [...q.categoryIds],
      correctOptionIndex: correctIndex >= 0 ? correctIndex : 0,
    });

    const opts = this.optionsFormArray;
    for (let i = 0; i < 4; i++) {
      const optData = q.options[i];
      opts.at(i).patchValue({ text: optData ? optData.text : '' });
    }

    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingQuestion.set(null);
    this.formError.set(null);
  }

  toggleCategorySelection(catId: string): void {
    const current = (this.questionForm.get('categoryIds')?.value as string[]) || [];
    let updated: string[];
    if (current.includes(catId)) {
      updated = current.filter((id) => id !== catId);
    } else {
      updated = [...current, catId];
    }
    this.questionForm.patchValue({ categoryIds: updated });
    this.questionForm.get('categoryIds')?.markAsTouched();
  }

  isCategorySelected(catId: string): boolean {
    const current = (this.questionForm.get('categoryIds')?.value as string[]) || [];
    return current.includes(catId);
  }

  saveQuestion(targetStatus?: QuestionStatus): void {
    if (this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      this.formError.set(
        'لطفاً تمام فیلدهای الزامی (متن سوال، توضیحات، ۴ گزینه و دسته‌بندی) را تکمیل کنید.',
      );
      return;
    }

    const formValue = this.questionForm.value;
    const catIds = formValue.categoryIds as string[];

    if (!catIds || catIds.length === 0) {
      this.formError.set('انتخاب حداقل یک دسته‌بندی الزامی است.');
      return;
    }

    const rawOptions = formValue.options as Array<{ text: string }>;
    const emptyOption = rawOptions.some((opt) => !opt.text || !opt.text.trim());
    if (emptyOption) {
      this.formError.set('وارد کردن متن برای هر ۴ گزینه الزامی است.');
      return;
    }

    const correctIndex = Number(formValue.correctOptionIndex);

    const questionOptions = rawOptions.map((opt, idx) => ({
      text: opt.text.trim(),
      sortOrder: idx + 1,
      isCorrect: idx === correctIndex,
    }));

    this.isSaving.set(true);
    this.formError.set(null);

    const editing = this.editingQuestion();

    if (editing) {
      const updatePayload: any = {
        text: formValue.text.trim(),
        explanation: formValue.explanation.trim(),
        difficulty: formValue.difficulty,
        imageKey: formValue.imageKey?.trim() || null,
        categoryIds: catIds,
        questionOptions,
      };

      if (targetStatus) {
        updatePayload.status = targetStatus;
      }

      this.api.updateQuestion(editing.id, updatePayload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeFormModal();
          this.showSuccess('سوال با موفقیت بروزرسانی شد.');
          this.loadQuestions();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.message || 'خطا در ویرایش سوال.';
          this.formError.set(Array.isArray(msg) ? msg.join('، ') : msg);
        },
      });
    } else {
      const createPayload = {
        text: formValue.text.trim(),
        explanation: formValue.explanation.trim(),
        difficulty: formValue.difficulty,
        imageKey: formValue.imageKey?.trim() || null,
        categoryIds: catIds,
        questionOptions,
      };

      this.api.createQuestion(createPayload).subscribe({
        next: (created) => {
          if (targetStatus && targetStatus !== QuestionStatus.DRAFT) {
            this.api.updateQuestion(created.id, { status: targetStatus }).subscribe({
              next: () => {
                this.isSaving.set(false);
                this.closeFormModal();
                this.showSuccess('سوال با موفقیت ثبت شد.');
                this.loadQuestions();
              },
              error: (err) => {
                this.isSaving.set(false);
                const msg = err.error?.message || 'سوال ایجاد شد اما تغییر وضعیت با خطا مواجه شد.';
                this.formError.set(Array.isArray(msg) ? msg.join('، ') : msg);
              },
            });
          } else {
            this.isSaving.set(false);
            this.closeFormModal();
            this.showSuccess('سوال جدید با موفقیت ثبت شد.');
            this.loadQuestions();
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.message || 'خطا در ایجاد سوال.';
          this.formError.set(Array.isArray(msg) ? msg.join('، ') : msg);
        },
      });
    }
  }

  submitForReview(q: AdminQuestionDto): void {
    this.api.updateQuestion(q.id, { status: QuestionStatus.PENDING_REVIEW }).subscribe({
      next: () => {
        this.showSuccess('سوال جهت بررسی ارسال شد.');
        this.loadQuestions();
      },
      error: (err) => {
        const msg = err.error?.message || 'خطا در ارسال برای بررسی.';
        this.error.set(Array.isArray(msg) ? msg.join('، ') : msg);
      },
    });
  }

  publishQuestion(q: AdminQuestionDto): void {
    this.api.publishQuestion(q.id).subscribe({
      next: () => {
        this.showSuccess('سوال با موفقیت منتشر شد.');
        this.loadQuestions();
      },
      error: (err) => {
        const msg = err.error?.message || 'خطا در انتشار سوال.';
        this.error.set(Array.isArray(msg) ? msg.join('، ') : msg);
      },
    });
  }

  onSearchInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      if (this.search() !== value) {
        this.search.set(value);
        this.page.set(1);
        this.loadQuestions();
      }
    }, 300);
  }

  onSearchSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.search.set(this.searchInput());
    this.page.set(1);
    this.loadQuestions();
  }

  onCategorySelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.categoryId.set(value);
    this.page.set(1);
    this.loadQuestions();
  }

  onDifficultySelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.difficulty.set(value as Difficulty | '');
    this.page.set(1);
    this.loadQuestions();
  }

  onStatusSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.status.set(value as QuestionStatus | '');
    this.page.set(1);
    this.loadQuestions();
  }

  onLimitSelect(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.limit.set(value);
    this.page.set(1);
    this.loadQuestions();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || (this.meta() && newPage > this.meta()!.totalPages)) {
      return;
    }
    this.page.set(newPage);
    this.loadQuestions();
  }

  clearFilters(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchInput.set('');
    this.search.set('');
    this.categoryId.set('');
    this.difficulty.set('');
    this.status.set('');
    this.page.set(1);
    this.loadQuestions();
  }

  retry(): void {
    this.loadQuestions();
  }

  getCategoryName(catIds: readonly string[]): string {
    if (!catIds || catIds.length === 0) return 'بدون دسته‌بندی';
    const names = catIds.map((id) => this.categoryMap().get(id) || id);
    return names.join('، ');
  }

  getDifficultyLabel(difficulty: Difficulty): string {
    return this.difficultyLabels[difficulty] || difficulty;
  }

  getStatusLabel(status: QuestionStatus): string {
    return this.statusLabels[status] || status;
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
