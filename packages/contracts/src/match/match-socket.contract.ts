import { Difficulty } from '../enums/difficulty.enum';
import { AnswerStatus } from '../enums/answer-status.enum';

export const MatchSocketClientEvents = {
  JOIN_MATCHMAKING: 'join_matchmaking',
  LEAVE_MATCHMAKING: 'leave_matchmaking',
  PLAYER_READY: 'player_ready',
  SUBMIT_ANSWER: 'submit_answer',
  RECONNECT_MATCH: 'reconnect_match',
  LEAVE_MATCH: 'leave_match',
} as const;

export type MatchSocketClientEvent =
  (typeof MatchSocketClientEvents)[keyof typeof MatchSocketClientEvents];

export const MatchSocketServerEvents = {
  MATCHMAKING_JOINED: 'matchmaking_joined',
  MATCHMAKING_LEFT: 'matchmaking_left',
  MATCH_QUEUED: 'match_queued',
  MATCH_FOUND: 'match_found',
  MATCHMAKING_ERROR: 'matchmaking_error',
  ROUND_START: 'round_start',
  ROUND_RESULT: 'round_result',
  MATCH_END: 'match_end',
  ERROR: 'error',
} as const;

export type MatchSocketServerEvent =
  (typeof MatchSocketServerEvents)[keyof typeof MatchSocketServerEvents];

export enum MatchSocketErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN_NOT_PARTICIPANT = 'FORBIDDEN_NOT_PARTICIPANT',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  ALREADY_ANSWERED = 'ALREADY_ANSWERED',
  ROUND_NOT_ACTIVE = 'ROUND_NOT_ACTIVE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  ALREADY_MATCHED = 'ALREADY_MATCHED',
  INSUFFICIENT_QUESTIONS = 'INSUFFICIENT_QUESTIONS',
}

export interface MatchSocketErrorPayload {
  code: MatchSocketErrorCode;
  message: string;
  details?: unknown;
}

export interface JoinMatchmakingC2SPayload {
  categoryId?: string;
  difficulty?: Difficulty;
}

export interface LeaveMatchmakingC2SPayload {
  categoryId?: string;
  difficulty?: Difficulty;
}

export interface PlayerReadyC2SPayload {
  matchId: string;
}

export interface MatchmakingJoinedS2CPayload {
  status: 'queued';
  categoryId?: string;
  difficulty?: Difficulty;
}

export interface MatchmakingLeftS2CPayload {
  status: 'left';
}

export interface MatchmakingErrorS2CPayload {
  code: MatchSocketErrorCode;
  message: string;
  details?: unknown;
}

export interface SubmitAnswerC2SPayload {
  matchId: string;
  matchQuestionId: string;
  selectedOptionId?: string;
}

export interface ReconnectMatchC2SPayload {
  matchId: string;
}

export interface LeaveMatchC2SPayload {
  matchId: string;
}

export interface MatchQueuedS2CPayload {
  status: 'queued';
  matchId?: string;
}

export interface MatchFoundS2CPayload {
  matchId: string;
  opponent: {
    userId: string;
    username?: string | null;
    displayName?: string | null;
    avatarKey?: string | null;
  };
  totalRounds: number;
}

export interface MatchQuestionOptionClient {
  id: string;
  text: string;
}

export interface MatchRoundStartS2CPayload {
  matchId: string;
  round: number;
  totalRounds: number;
  question: {
    matchQuestionId: string;
    questionId: string;
    text: string;
    imageKey?: string | null;
    options: MatchQuestionOptionClient[];
    position: number;
  };
  serverNow: string;
  deadlineAt: string;
}

export interface MatchRoundResultS2CPayload {
  matchId: string;
  round: number;
  correctOptionId: string;
  yourScore: number;
  opponentScore: number;
  yourStatus: AnswerStatus;
  opponentStatus: AnswerStatus;
  yourSelectedOptionId?: string | null;
  opponentSelectedOptionId?: string | null;
}

export interface MatchEndS2CPayload {
  matchId: string;
  winnerId: string | null;
  yourScore: number;
  opponentScore: number;
  isDraw: boolean;
}
