import { Component, ChangeDetectionStrategy, OnInit, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { TimerRingComponent } from '../../shared/ui/timer-ring.component';
import { OptionButtonComponent, OptionState } from '../../shared/ui/option-button.component';
import { GameFacade } from '../../core/data/game.facade';
import { MatchStore } from '../../core/services/match.store';

@Component({
  selector: 'app-1v1',
  templateUrl: './1v1.component.html',
  styleUrl: './1v1.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent, TimerRingComponent, OptionButtonComponent],
})
export class OneVOneComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly gameFacade = inject(GameFacade);
  readonly store = inject(MatchStore);

  readonly currentUser = this.gameFacade.user;

  readonly isAnsweredOrSubmitting = computed(() => {
    const state = this.store.answerSubmissionState();
    return state === 'submitting' || state === 'submitted';
  });

  ngOnInit(): void {
    this.store.init();
  }

  getOptionLabel(idx: number): string {
    return ['الف', 'ب', 'ج', 'د'][idx] || '';
  }

  getOptionState(optionId: string): OptionState {
    const phase = this.store.phase();

    if (phase === 'active_round') {
      const selected = this.store.yourSelectedOptionId();
      const submissionState = this.store.answerSubmissionState();

      if (selected === optionId) {
        return 'SELECTED';
      }
      if (submissionState !== 'not_submitted') {
        return 'DISABLED';
      }
      return 'DEFAULT';
    }

    if (phase === 'round_result') {
      const res = this.store.roundResult();
      if (!res) return 'DISABLED';

      if (res.correctOptionId === optionId) {
        return 'CORRECT';
      }
      if (res.yourSelectedOptionId === optionId) {
        return 'INCORRECT';
      }
      return 'DISABLED';
    }

    return 'DEFAULT';
  }

  startSearching(): void {
    this.store.joinMatchmaking();
  }

  cancelSearching(): void {
    this.store.leaveMatchmaking();
  }

  selectOption(optionId: string): void {
    this.store.submitAnswer(optionId);
  }

  resetSetup(): void {
    this.store.reset();
  }

  getDifficultyLabel(diff: string | null | undefined): string {
    switch (diff) {
      case 'EASY':
        return 'آسان';
      case 'MEDIUM':
        return 'متوسط';
      case 'HARD':
        return 'سخت';
      case 'VERY_HARD':
        return 'خیلی سخت';
      default:
        return 'متوسط';
    }
  }

  getStatusIcon(status: string | null | undefined): string {
    switch (status) {
      case 'CORRECT':
        return '✓';
      case 'INCORRECT':
        return '✗';
      case 'TIMED_OUT':
        return '⏱️';
      default:
        return '-';
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
