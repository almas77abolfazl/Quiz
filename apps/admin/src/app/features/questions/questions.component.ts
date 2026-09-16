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
import {
  AdminQuestionDto,
  QuestionPaginationMetaDto,
  Difficulty,
  QuestionStatus,
} from '@quiz/contracts';
import { AdminApiService, Category } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);

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
      error: () => {
        // Categories load failure can gracefully fallback to empty array
      },
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
}
