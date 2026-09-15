import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Difficulty } from '@quiz/contracts';

@Component({
  selector: 'app-difficulty-chip',
  templateUrl: './difficulty-chip.component.html',
  styleUrl: './difficulty-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DifficultyChipComponent {
  readonly difficulty = input<Difficulty | string>(Difficulty.EASY);

  readonly label = computed(() => {
    switch (this.difficulty()) {
      case Difficulty.EASY:
      case 'EASY':
        return 'آسان';
      case Difficulty.MEDIUM:
      case 'MEDIUM':
        return 'متوسط';
      case Difficulty.HARD:
      case 'HARD':
        return 'سخت';
      case Difficulty.VERY_HARD:
      case 'VERY_HARD':
        return 'خیلی سخت';
      default:
        return 'متوسط';
    }
  });

  readonly difficultyClass = computed(() => {
    switch (this.difficulty()) {
      case Difficulty.EASY:
      case 'EASY':
        return 'easy';
      case Difficulty.MEDIUM:
      case 'MEDIUM':
        return 'medium';
      case Difficulty.HARD:
      case 'HARD':
        return 'hard';
      case Difficulty.VERY_HARD:
      case 'VERY_HARD':
        return 'very-hard';
      default:
        return 'medium';
    }
  });
}
