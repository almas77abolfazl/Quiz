import { Difficulty } from '../enums/difficulty.enum';

export const MatchSocketClientEvents = {
  JOIN_MATCHMAKING: 'join_matchmaking',
  SUBMIT_ANSWER: 'submit_answer',
  RECONNECT_MATCH: 'reconnect_match',
  LEAVE_MATCH: 'leave_match',
} as const;

export type MatchSocketClientEvent =
  (typeof MatchSocketClientEvents)[keyof typeof MatchSocketClientEvents];

export const MatchSocketServerEvents = {
  MATCH_QUEUED: 'match_queued',
  MATCH_FOUND: 'match_found',
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
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
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
}

export interface MatchQuestionOptionClient {
  id: string;
  text: string;
}

export interface MatchRoundStartS2CPayload {
  matchId: string;
  question: {
    matchQuestionId: string;
    questionId: string;
    text: string;
    options: MatchQuestionOptionClient[];
    position: number;
    totalRounds: number;
  };
}

export interface MatchRoundResultS2CPayload {
  matchId: string;
  roundIndex: number;
  yourScore: number;
  opponentScore: number;
}

export interface MatchEndS2CPayload {
  matchId: string;
  winnerId: string | null;
  yourScore: number;
  opponentScore: number;
  coinsEarned: number;
}
