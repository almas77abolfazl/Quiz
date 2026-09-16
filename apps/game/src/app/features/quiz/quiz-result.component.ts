import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { UserAnswerRecord } from './models/quiz.models';

@Component({
  selector: 'app-quiz-result',
  templateUrl: './quiz-result.component.html',
  styleUrl: './quiz-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent],
})
export class QuizResultComponent implements OnInit {
  private readonly router = inject(Router);

  readonly correctCount = signal<number>(0);
  readonly incorrectCount = signal<number>(0);
  readonly timedOutCount = signal<number>(0);
  readonly totalQuestions = signal<number>(5);
  readonly earnedCoins = signal<number>(0);
  readonly earnedPoints = signal<number>(0);
  readonly userAnswers = signal<UserAnswerRecord[]>([]);

  readonly isHighPerformance = computed(
    () => this.correctCount() >= Math.ceil(this.totalQuestions() * 0.8),
  );

  ngOnInit(): void {
    const navState = history.state;
    if (
      navState &&
      (navState.totalQuestions !== undefined || navState.correctCount !== undefined)
    ) {
      this.correctCount.set(navState.correctCount || 0);
      this.incorrectCount.set(navState.incorrectCount || 0);
      this.timedOutCount.set(navState.timedOutCount || 0);
      this.totalQuestions.set(navState.totalQuestions || 5);
      this.earnedCoins.set(navState.earnedCoins || 0);
      this.earnedPoints.set(navState.earnedPoints || 0);
      this.userAnswers.set(navState.userAnswers || []);
    }
  }

  playAgain(): void {
    this.router.navigate(['/quiz']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
