import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import {
  MatchSocketClientEvents,
  MatchSocketServerEvents,
  MatchSocketErrorCode,
  MatchSocketErrorPayload,
  MatchFoundS2CPayload,
  MatchRoundStartS2CPayload,
  MatchRoundResultS2CPayload,
  MatchEndS2CPayload,
  OpponentConnectionChangedS2CPayload,
  MatchReconnectS2CPayload,
  Difficulty,
} from '@quiz/contracts';
import { MatchSocketService } from './match-socket.service';

export type MatchPhase =
  | 'idle'
  | 'searching'
  | 'waiting_for_ready'
  | 'active_round'
  | 'round_result'
  | 'completed'
  | 'error';

export type AnswerSubmissionState = 'not_submitted' | 'submitting' | 'submitted';

const ACTIVE_MATCH_STORAGE_KEY = 'quiz_active_match_id';

@Injectable({ providedIn: 'root' })
export class MatchStore implements OnDestroy {
  private readonly socketService = inject(MatchSocketService);

  readonly phase = signal<MatchPhase>('idle');
  readonly connectionState = this.socketService.connectionState;
  readonly matchId = signal<string | null>(null);
  readonly opponent = signal<MatchFoundS2CPayload['opponent'] | null>(null);
  readonly totalRounds = signal<number>(5);
  readonly currentRound = signal<number>(0);
  readonly yourScore = signal<number>(0);
  readonly opponentScore = signal<number>(0);

  readonly question = signal<MatchRoundStartS2CPayload['question'] | null>(null);
  readonly deadlineAt = signal<string | null>(null);
  readonly serverNow = signal<string | null>(null);
  readonly clockOffset = signal<number>(0);

  readonly answerSubmissionState = signal<AnswerSubmissionState>('not_submitted');
  readonly yourSelectedOptionId = signal<string | null>(null);

  readonly roundResult = signal<MatchRoundResultS2CPayload | null>(null);
  readonly matchEndResult = signal<MatchEndS2CPayload | null>(null);
  readonly opponentOnline = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  private readonly tick = signal<number>(Date.now());
  private timerRef: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  readonly secondsLeft = computed(() => {
    // Read tick signal to recalculate on interval
    this.tick();
    const deadline = this.deadlineAt();
    if (!deadline) return 0;
    const deadlineMs = new Date(deadline).getTime();
    const nowMs = Date.now() + this.clockOffset();
    const remaining = Math.ceil((deadlineMs - nowMs) / 1000);
    return Math.max(0, remaining);
  });

  readonly isWin = computed(() => {
    const res = this.matchEndResult();
    if (!res) return false;
    return !res.isDraw && res.yourScore > res.opponentScore;
  });

  readonly isLoss = computed(() => {
    const res = this.matchEndResult();
    if (!res) return false;
    return !res.isDraw && res.yourScore < res.opponentScore;
  });

  readonly isDraw = computed(() => {
    return this.matchEndResult()?.isDraw ?? false;
  });

  // Explicit callback references for listener cleanup
  private readonly onMatchmakingJoined = (payload: any) => {
    this.phase.set('searching');
  };

  private readonly onMatchmakingLeft = () => {
    this.phase.set('idle');
    this.clearSavedMatchId();
  };

  private readonly onMatchFound = (payload: MatchFoundS2CPayload) => {
    this.matchId.set(payload.matchId);
    this.saveMatchId(payload.matchId);
    this.opponent.set(payload.opponent);
    this.totalRounds.set(payload.totalRounds);
    this.phase.set('waiting_for_ready');

    this.socketService.emit(MatchSocketClientEvents.PLAYER_READY, {
      matchId: payload.matchId,
    });
  };

  private readonly onRoundStart = (payload: MatchRoundStartS2CPayload) => {
    this.matchId.set(payload.matchId);
    this.currentRound.set(payload.round);
    this.totalRounds.set(payload.totalRounds);
    this.question.set(payload.question);
    this.deadlineAt.set(payload.deadlineAt);
    this.serverNow.set(payload.serverNow);
    this.clockOffset.set(new Date(payload.serverNow).getTime() - Date.now());

    this.answerSubmissionState.set('not_submitted');
    this.yourSelectedOptionId.set(null);
    this.roundResult.set(null);
    this.phase.set('active_round');
  };

  private readonly onRoundResult = (payload: MatchRoundResultS2CPayload) => {
    this.currentRound.set(payload.round);
    this.yourScore.set(payload.yourScore);
    this.opponentScore.set(payload.opponentScore);
    this.roundResult.set(payload);
    this.phase.set('round_result');
  };

  private readonly onMatchEnd = (payload: MatchEndS2CPayload) => {
    this.yourScore.set(payload.yourScore);
    this.opponentScore.set(payload.opponentScore);
    this.matchEndResult.set(payload);
    this.phase.set('completed');
    this.clearSavedMatchId();
  };

  private readonly onOpponentConnectionChanged = (payload: OpponentConnectionChangedS2CPayload) => {
    this.opponentOnline.set(payload.isOnline);
  };

  private readonly onMatchReconnected = (payload: MatchReconnectS2CPayload) => {
    this.matchId.set(payload.matchId);
    this.saveMatchId(payload.matchId);
    this.currentRound.set(payload.currentRound);
    this.totalRounds.set(payload.totalRounds);
    this.yourScore.set(payload.yourScore);
    this.opponentScore.set(payload.opponentScore);
    this.serverNow.set(payload.serverNow);
    this.clockOffset.set(new Date(payload.serverNow).getTime() - Date.now());

    if (payload.opponent) {
      this.opponent.set(payload.opponent);
      this.opponentOnline.set(payload.opponent.isOnline);
    }

    switch (payload.phase) {
      case 'WAITING':
        this.phase.set('waiting_for_ready');
        break;

      case 'ACTIVE_ROUND':
        this.phase.set('active_round');
        this.deadlineAt.set(payload.deadlineAt);
        this.question.set(payload.question);
        if (payload.yourAnswerState.answered) {
          this.answerSubmissionState.set('submitted');
          this.yourSelectedOptionId.set(payload.yourAnswerState.selectedOptionId ?? null);
        } else {
          this.answerSubmissionState.set('not_submitted');
          this.yourSelectedOptionId.set(null);
        }
        break;

      case 'ROUND_RESULT':
        this.phase.set('round_result');
        this.roundResult.set(payload.roundResult);
        break;

      case 'COMPLETED':
        this.phase.set('completed');
        this.matchEndResult.set(payload.finalResult);
        this.clearSavedMatchId();
        break;
    }
  };

  private readonly onError = (payload: MatchSocketErrorPayload) => {
    if (
      payload.code === MatchSocketErrorCode.MATCH_NOT_FOUND ||
      payload.code === MatchSocketErrorCode.FORBIDDEN_NOT_PARTICIPANT
    ) {
      this.clearSavedMatchId();
    }
    this.errorMessage.set(payload.message || 'خطایی در مسابقه رخ داد');
  };

  constructor() {
    this.startTimer();
  }

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.socketService.connect();
    this.registerListeners();

    // Check if there is an active match saved in sessionStorage or reconnected
    const savedMatchId = this.getSavedMatchId();
    if (savedMatchId) {
      this.socketService.emit(MatchSocketClientEvents.RECONNECT_MATCH, {
        matchId: savedMatchId,
      });
    }
  }

  private registerListeners(): void {
    this.socketService.on(MatchSocketServerEvents.MATCHMAKING_JOINED, this.onMatchmakingJoined);
    this.socketService.on(MatchSocketServerEvents.MATCHMAKING_LEFT, this.onMatchmakingLeft);
    this.socketService.on(MatchSocketServerEvents.MATCH_FOUND, this.onMatchFound);
    this.socketService.on(MatchSocketServerEvents.ROUND_START, this.onRoundStart);
    this.socketService.on(MatchSocketServerEvents.ROUND_RESULT, this.onRoundResult);
    this.socketService.on(MatchSocketServerEvents.MATCH_END, this.onMatchEnd);
    this.socketService.on(
      MatchSocketServerEvents.OPPONENT_CONNECTION_CHANGED,
      this.onOpponentConnectionChanged,
    );
    this.socketService.on(MatchSocketServerEvents.MATCH_RECONNECTED, this.onMatchReconnected);
    this.socketService.on(MatchSocketServerEvents.MATCHMAKING_ERROR, this.onError);
    this.socketService.on(MatchSocketServerEvents.ERROR, this.onError);
  }

  private unregisterListeners(): void {
    this.socketService.off(MatchSocketServerEvents.MATCHMAKING_JOINED, this.onMatchmakingJoined);
    this.socketService.off(MatchSocketServerEvents.MATCHMAKING_LEFT, this.onMatchmakingLeft);
    this.socketService.off(MatchSocketServerEvents.MATCH_FOUND, this.onMatchFound);
    this.socketService.off(MatchSocketServerEvents.ROUND_START, this.onRoundStart);
    this.socketService.off(MatchSocketServerEvents.ROUND_RESULT, this.onRoundResult);
    this.socketService.off(MatchSocketServerEvents.MATCH_END, this.onMatchEnd);
    this.socketService.off(
      MatchSocketServerEvents.OPPONENT_CONNECTION_CHANGED,
      this.onOpponentConnectionChanged,
    );
    this.socketService.off(MatchSocketServerEvents.MATCH_RECONNECTED, this.onMatchReconnected);
    this.socketService.off(MatchSocketServerEvents.MATCHMAKING_ERROR, this.onError);
    this.socketService.off(MatchSocketServerEvents.ERROR, this.onError);
  }

  joinMatchmaking(categoryId?: string, difficulty?: Difficulty): void {
    this.init();
    this.errorMessage.set(null);
    this.phase.set('searching');
    this.socketService.emit(MatchSocketClientEvents.JOIN_MATCHMAKING, {
      categoryId,
      difficulty,
    });
  }

  leaveMatchmaking(): void {
    this.socketService.emit(MatchSocketClientEvents.LEAVE_MATCHMAKING, {});
    this.phase.set('idle');
    this.clearSavedMatchId();
  }

  submitAnswer(selectedOptionId: string): void {
    if (this.phase() !== 'active_round') return;
    if (this.answerSubmissionState() !== 'not_submitted') return;

    const currentQ = this.question();
    const currentMatchId = this.matchId();
    if (!currentQ || !currentMatchId) return;

    this.answerSubmissionState.set('submitting');
    this.yourSelectedOptionId.set(selectedOptionId);

    this.socketService.emit(
      MatchSocketClientEvents.SUBMIT_ANSWER,
      {
        matchId: currentMatchId,
        matchQuestionId: currentQ.matchQuestionId,
        selectedOptionId,
      },
      (response: any) => {
        if (response && response.error) {
          // Submission rejected or failed: restore to retryable state
          this.answerSubmissionState.set('not_submitted');
          this.yourSelectedOptionId.set(null);
        } else {
          // Server accepted submission
          this.answerSubmissionState.set('submitted');
        }
      },
    );
  }

  leaveMatch(): void {
    const currentMatchId = this.matchId();
    if (currentMatchId) {
      this.socketService.emit(MatchSocketClientEvents.LEAVE_MATCH, {
        matchId: currentMatchId,
      });
    }
    this.reset();
  }

  reset(): void {
    this.clearSavedMatchId();
    this.matchId.set(null);
    this.opponent.set(null);
    this.currentRound.set(0);
    this.yourScore.set(0);
    this.opponentScore.set(0);
    this.question.set(null);
    this.deadlineAt.set(null);
    this.serverNow.set(null);
    this.clockOffset.set(0);
    this.answerSubmissionState.set('not_submitted');
    this.yourSelectedOptionId.set(null);
    this.roundResult.set(null);
    this.matchEndResult.set(null);
    this.errorMessage.set(null);
    this.phase.set('idle');
  }

  private saveMatchId(id: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, id);
    }
  }

  private getSavedMatchId(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
    }
    return null;
  }

  private clearSavedMatchId(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
    }
  }

  private startTimer(): void {
    if (this.timerRef === null) {
      this.timerRef = setInterval(() => {
        this.tick.set(Date.now());
      }, 1000);
    }
  }

  private stopTimer(): void {
    if (this.timerRef !== null) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.unregisterListeners();
  }
}
