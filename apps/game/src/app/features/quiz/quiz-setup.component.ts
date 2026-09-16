import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { SoloQuizApiService } from '../../core/services/solo-quiz-api.service';
import { Difficulty, CategorySummaryDto } from '@quiz/contracts';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-quiz-setup',
  templateUrl: './quiz-setup.component.html',
  styleUrl: './quiz-setup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent, DifficultyChipComponent],
})
export class QuizSetupComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly soloQuizApi = inject(SoloQuizApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly apiCategories = signal<CategorySummaryDto[]>([]);
  readonly selectedCategoryId = signal<string>('ALL');
  readonly selectedDifficulty = signal<Difficulty>(Difficulty.MEDIUM);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly difficulties = [
    { value: Difficulty.EASY, rewardText: '۱ امتیاز فصل + ۱ سکه' },
    { value: Difficulty.MEDIUM, rewardText: '۲ امتیاز فصل + ۱ سکه' },
    { value: Difficulty.HARD, rewardText: '۳ امتیاز فصل + ۲ سکه' },
    { value: Difficulty.VERY_HARD, rewardText: '۵ امتیاز فصل + ۳ سکه' },
  ];

  readonly selectedCategoryTitle = computed(() => {
    const catId = this.selectedCategoryId();
    if (catId === 'ALL') return 'همه دسته‌ها (تصادفی)';
    const cat = this.apiCategories().find((c) => c.id === catId);
    return cat ? cat.title : 'انتخاب نشده';
  });

  readonly rewardSummaryText = computed(() => {
    switch (this.selectedDifficulty()) {
      case Difficulty.EASY:
        return '۱ امتیاز + ۱ سکه بر اساس هر سؤال';
      case Difficulty.MEDIUM:
        return '۲ امتیاز + ۱ سکه بر اساس هر سؤال';
      case Difficulty.HARD:
        return '۳ امتیاز + ۲ سکه بر اساس هر سؤال';
      case Difficulty.VERY_HARD:
        return '۵ امتیاز + ۳ سکه بر اساس هر سؤال';
      default:
        return '';
    }
  });

  ngOnInit(): void {
    this.loadCategories();
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['categoryId']) {
        this.selectedCategoryId.set(params['categoryId']);
      }
    });
  }

  loadCategories(): void {
    this.soloQuizApi
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats) => this.apiCategories.set(cats),
        error: () => {},
      });
  }

  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.errorMessage.set(null);
  }

  selectDifficulty(diff: Difficulty): void {
    this.selectedDifficulty.set(diff);
    this.errorMessage.set(null);
  }

  startQuiz(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const catId = this.selectedCategoryId();
    const diff = this.selectedDifficulty();

    this.soloQuizApi
      .startQuiz(catId, diff)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.loading.set(false);
          this.router.navigate(['/quiz/play'], {
            state: { session },
          });
        },
        error: (err) => {
          this.loading.set(false);
          if (
            err?.status === 400 ||
            err?.error?.message?.includes('No questions') ||
            err?.error?.message?.includes('Fewer than 5')
          ) {
            this.errorMessage.set(
              'تعداد سؤالات موجود برای این دسته و سطح سختی کمتر از ۵ سؤال است. لطفاً دسته یا سطح دیگری انتخاب کنید.',
            );
          } else {
            this.errorMessage.set('خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش کنید.');
          }
        },
      });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
