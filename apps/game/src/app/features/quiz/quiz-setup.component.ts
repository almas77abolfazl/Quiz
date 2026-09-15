import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { DifficultyChipComponent } from '../../shared/ui/difficulty-chip.component';
import { GameFacade } from '../../core/data/game.facade';
import { Difficulty } from '@quiz/contracts';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-quiz-setup',
  templateUrl: './quiz-setup.component.html',
  styleUrl: './quiz-setup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent, DifficultyChipComponent],
})
export class QuizSetupComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gameFacade = inject(GameFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = this.gameFacade.categories;
  readonly selectedCategoryId = signal<string>('ALL');
  readonly selectedDifficulty = signal<Difficulty>(Difficulty.MEDIUM);
  readonly loading = signal<boolean>(false);
  private startTimer: ReturnType<typeof setTimeout> | null = null;

  readonly difficulties = [
    { value: Difficulty.EASY, rewardText: '۱ امتیاز فصل + ۱ سکه' },
    { value: Difficulty.MEDIUM, rewardText: '۲ امتیاز فصل + ۱ سکه' },
    { value: Difficulty.HARD, rewardText: '۳ امتیاز فصل + ۲ سکه' },
    { value: Difficulty.VERY_HARD, rewardText: '۵ امتیاز فصل + ۳ سکه' },
  ];

  readonly selectedCategoryTitle = computed(() => {
    const catId = this.selectedCategoryId();
    if (catId === 'ALL') return 'همه دسته‌ها (تصادفی)';
    const cat = this.categories().find((c) => c.id === catId);
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
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['categoryId']) {
        this.selectedCategoryId.set(params['categoryId']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.startTimer !== null) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
  }

  selectDifficulty(diff: Difficulty): void {
    this.selectedDifficulty.set(diff);
  }

  startQuiz(): void {
    this.loading.set(true);
    this.startTimer = setTimeout(() => {
      this.router.navigate(['/quiz/play'], {
        queryParams: {
          categoryId: this.selectedCategoryId(),
          difficulty: this.selectedDifficulty(),
        },
      });
    }, 400);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
