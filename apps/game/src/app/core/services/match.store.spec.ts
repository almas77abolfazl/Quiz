import { TestBed } from '@angular/core/testing';
import { MatchStore } from './match.store';
import { MatchSocketService } from './match-socket.service';
import {
  MatchSocketClientEvents,
  MatchSocketServerEvents,
  MatchFoundS2CPayload,
  MatchRoundStartS2CPayload,
  MatchRoundResultS2CPayload,
  MatchEndS2CPayload,
  MatchReconnectS2CPayload,
  AnswerStatus,
  MatchStatus,
} from '@quiz/contracts';
import { signal } from '@angular/core';

describe('MatchStore', () => {
  let store: MatchStore;
  let socketListeners: Map<string, (payload?: any, ack?: any) => void>;
  let emittedEvents: Array<{ event: string; payload?: any; ack?: any }>;
  let mockConnectionState: ReturnType<typeof signal<any>>;

  beforeEach(() => {
    sessionStorage.clear();
    socketListeners = new Map();
    emittedEvents = [];
    mockConnectionState = signal('connected');

    const socketServiceMock = {
      connectionState: mockConnectionState,
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn((event: string, callback: (payload?: any) => void) => {
        socketListeners.set(event, callback);
      }),
      off: vi.fn((event: string) => {
        socketListeners.delete(event);
      }),
      emit: vi.fn((event: string, payload?: any, ack?: any) => {
        emittedEvents.push({ event, payload, ack });
      }),
    };

    TestBed.configureTestingModule({
      providers: [MatchStore, { provide: MatchSocketService, useValue: socketServiceMock }],
    });

    store = TestBed.inject(MatchStore);
    store.init();
  });

  afterEach(() => {
    store.ngOnDestroy();
    sessionStorage.clear();
  });

  it('should initialize with idle phase and empty state', () => {
    expect(store.phase()).toBe('idle');
    expect(store.matchId()).toBeNull();
    expect(store.opponent()).toBeNull();
  });

  it('should handle matchmaking join and leave', () => {
    store.joinMatchmaking();
    expect(store.phase()).toBe('searching');
    expect(emittedEvents).toContainEqual({
      event: MatchSocketClientEvents.JOIN_MATCHMAKING,
      payload: { categoryId: undefined, difficulty: undefined },
      ack: undefined,
    });

    // Server acknowledges joined
    const joinedCallback = socketListeners.get(MatchSocketServerEvents.MATCHMAKING_JOINED);
    joinedCallback?.({ status: 'queued' });
    expect(store.phase()).toBe('searching');

    // Player cancels
    store.leaveMatchmaking();
    expect(store.phase()).toBe('idle');
    expect(emittedEvents).toContainEqual({
      event: MatchSocketClientEvents.LEAVE_MATCHMAKING,
      payload: {},
      ack: undefined,
    });
  });

  it('should handle match_found and auto emit player_ready', () => {
    store.joinMatchmaking();

    const matchFoundPayload: MatchFoundS2CPayload = {
      matchId: 'match_123',
      opponent: {
        userId: 'user_opp',
        username: 'OpponentUser',
        displayName: 'Opponent Display',
        avatarKey: 'avatar_1',
      },
      totalRounds: 5,
    };

    const matchFoundCallback = socketListeners.get(MatchSocketServerEvents.MATCH_FOUND);
    matchFoundCallback?.(matchFoundPayload);

    expect(store.phase()).toBe('waiting_for_ready');
    expect(store.matchId()).toBe('match_123');
    expect(store.opponent()).toEqual(matchFoundPayload.opponent);
    expect(sessionStorage.getItem('quiz_active_match_id')).toBe('match_123');

    expect(emittedEvents).toContainEqual({
      event: MatchSocketClientEvents.PLAYER_READY,
      payload: { matchId: 'match_123' },
      ack: undefined,
    });
  });

  it('should render round_start and calculate countdown based on server clock offset', () => {
    const nowIso = new Date().toISOString();
    const deadlineIso = new Date(Date.now() + 30000).toISOString();

    const roundStartPayload: MatchRoundStartS2CPayload = {
      matchId: 'match_123',
      round: 1,
      totalRounds: 5,
      question: {
        matchQuestionId: 'mq_1',
        questionId: 'q_1',
        text: 'test question?',
        options: [
          { id: 'opt_1', text: 'Option 1' },
          { id: 'opt_2', text: 'Option 2' },
        ],
        position: 1,
      },
      serverNow: nowIso,
      deadlineAt: deadlineIso,
    };

    const roundStartCallback = socketListeners.get(MatchSocketServerEvents.ROUND_START);
    roundStartCallback?.(roundStartPayload);

    expect(store.phase()).toBe('active_round');
    expect(store.currentRound()).toBe(1);
    expect(store.question()).toEqual(roundStartPayload.question);
    expect(store.answerSubmissionState()).toBe('not_submitted');
    expect(store.secondsLeft()).toBeGreaterThanOrEqual(28);
  });

  it('should allow answer submission only once and handle typed ack', () => {
    const roundStartCallback = socketListeners.get(MatchSocketServerEvents.ROUND_START);
    roundStartCallback?.({
      matchId: 'match_123',
      round: 1,
      totalRounds: 5,
      question: {
        matchQuestionId: 'mq_1',
        questionId: 'q_1',
        text: 'test question?',
        options: [{ id: 'opt_1', text: 'Option 1' }],
        position: 1,
      },
      serverNow: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 30000).toISOString(),
    });

    store.submitAnswer('opt_1');
    expect(store.answerSubmissionState()).toBe('submitting');
    expect(store.yourSelectedOptionId()).toBe('opt_1');

    // Duplicate submission ignored while submitting
    store.submitAnswer('opt_2');
    expect(store.yourSelectedOptionId()).toBe('opt_1');

    // Simulate server ack success
    const lastEmit = emittedEvents[emittedEvents.length - 1];
    expect(lastEmit.event).toBe(MatchSocketClientEvents.SUBMIT_ANSWER);
    lastEmit.ack?.({ status: 'ok' });

    expect(store.answerSubmissionState()).toBe('submitted');
  });

  it('should restore retryable state if answer submission receives error ack', () => {
    const roundStartCallback = socketListeners.get(MatchSocketServerEvents.ROUND_START);
    roundStartCallback?.({
      matchId: 'match_123',
      round: 1,
      totalRounds: 5,
      question: {
        matchQuestionId: 'mq_1',
        questionId: 'q_1',
        text: 'test question?',
        options: [{ id: 'opt_1', text: 'Option 1' }],
        position: 1,
      },
      serverNow: new Date().toISOString(),
      deadlineAt: new Date(Date.now() + 30000).toISOString(),
    });

    store.submitAnswer('opt_1');
    expect(store.answerSubmissionState()).toBe('submitting');

    // Server rejects
    const lastEmit = emittedEvents[emittedEvents.length - 1];
    lastEmit.ack?.({ error: { code: 'ERROR', message: 'Rejected' } });

    expect(store.answerSubmissionState()).toBe('not_submitted');
    expect(store.yourSelectedOptionId()).toBeNull();
  });

  it('should render round_result and update scores', () => {
    const roundResultPayload: MatchRoundResultS2CPayload = {
      matchId: 'match_123',
      round: 1,
      correctOptionId: 'opt_1',
      yourScore: 1,
      opponentScore: 0,
      yourStatus: AnswerStatus.CORRECT,
      opponentStatus: AnswerStatus.INCORRECT,
      yourSelectedOptionId: 'opt_1',
      opponentSelectedOptionId: 'opt_2',
    };

    const callback = socketListeners.get(MatchSocketServerEvents.ROUND_RESULT);
    callback?.(roundResultPayload);

    expect(store.phase()).toBe('round_result');
    expect(store.yourScore()).toBe(1);
    expect(store.opponentScore()).toBe(0);
    expect(store.roundResult()).toEqual(roundResultPayload);
  });

  it('should handle match_end and win/loss/draw flags', () => {
    const matchEndPayload: MatchEndS2CPayload = {
      matchId: 'match_123',
      winnerId: 'user_me',
      yourScore: 4,
      opponentScore: 2,
      isDraw: false,
    };

    const callback = socketListeners.get(MatchSocketServerEvents.MATCH_END);
    callback?.(matchEndPayload);

    expect(store.phase()).toBe('completed');
    expect(store.isWin()).toBe(true);
    expect(store.isLoss()).toBe(false);
    expect(store.isDraw()).toBe(false);
    expect(sessionStorage.getItem('quiz_active_match_id')).toBeNull();
  });

  it('should restore state from reconnect snapshot for all four phases', () => {
    const callback = socketListeners.get(MatchSocketServerEvents.MATCH_RECONNECTED);

    // 1. WAITING phase
    const waitingPayload: MatchReconnectS2CPayload = {
      matchId: 'match_123',
      matchStatus: MatchStatus.WAITING,
      phase: 'WAITING',
      currentRound: 0,
      totalRounds: 5,
      yourScore: 0,
      opponentScore: 0,
      serverNow: new Date().toISOString(),
      opponent: { userId: 'opp_1', username: 'Opponent', isOnline: true },
    };
    callback?.(waitingPayload);
    expect(store.phase()).toBe('waiting_for_ready');

    // 2. ACTIVE_ROUND phase
    const activeRoundPayload: MatchReconnectS2CPayload = {
      matchId: 'match_123',
      matchStatus: MatchStatus.ACTIVE,
      phase: 'ACTIVE_ROUND',
      currentRound: 2,
      totalRounds: 5,
      yourScore: 1,
      opponentScore: 1,
      serverNow: new Date().toISOString(),
      opponent: { userId: 'opp_1', username: 'Opponent', isOnline: true },
      deadlineAt: new Date(Date.now() + 20000).toISOString(),
      question: {
        matchQuestionId: 'mq_2',
        questionId: 'q_2',
        text: 'reconnected q',
        options: [{ id: 'opt_1', text: 'A' }],
        position: 2,
      },
      yourAnswerState: { answered: true, selectedOptionId: 'opt_1' },
    };
    callback?.(activeRoundPayload);
    expect(store.phase()).toBe('active_round');
    expect(store.currentRound()).toBe(2);
    expect(store.answerSubmissionState()).toBe('submitted');
    expect(store.yourSelectedOptionId()).toBe('opt_1');

    // 3. ROUND_RESULT phase
    const roundResultPayload: MatchReconnectS2CPayload = {
      matchId: 'match_123',
      matchStatus: MatchStatus.ACTIVE,
      phase: 'ROUND_RESULT',
      currentRound: 2,
      totalRounds: 5,
      yourScore: 1,
      opponentScore: 1,
      serverNow: new Date().toISOString(),
      opponent: { userId: 'opp_1', username: 'Opponent', isOnline: true },
      transitionDeadlineAt: new Date(Date.now() + 5000).toISOString(),
      roundResult: {
        matchId: 'match_123',
        round: 2,
        correctOptionId: 'opt_1',
        yourScore: 1,
        opponentScore: 1,
        yourStatus: AnswerStatus.CORRECT,
        opponentStatus: AnswerStatus.CORRECT,
      },
    };
    callback?.(roundResultPayload);
    expect(store.phase()).toBe('round_result');

    // 4. COMPLETED phase
    const completedPayload: MatchReconnectS2CPayload = {
      matchId: 'match_123',
      matchStatus: MatchStatus.COMPLETED,
      phase: 'COMPLETED',
      currentRound: 5,
      totalRounds: 5,
      yourScore: 3,
      opponentScore: 2,
      serverNow: new Date().toISOString(),
      opponent: { userId: 'opp_1', username: 'Opponent', isOnline: true },
      finalResult: {
        matchId: 'match_123',
        winnerId: 'me',
        yourScore: 3,
        opponentScore: 2,
        isDraw: false,
      },
    };
    callback?.(completedPayload);
    expect(store.phase()).toBe('completed');
  });

  it('should unregister exact listeners on destroy without error', () => {
    store.ngOnDestroy();
    expect(socketListeners.size).toBe(0);
  });
});
