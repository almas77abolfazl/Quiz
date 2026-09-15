import assert from 'node:assert';
import {
  UserRole,
  Difficulty,
  QuestionStatus,
  GameStatus,
  AnswerStatus,
  MatchStatus,
  CoinTransactionType,
  PrizeType,
  PrizeClaimStatus,
  ReportTargetType,
  ReportStatus
} from '@quiz/contracts';

assert.strictEqual(UserRole.PLAYER, 'PLAYER');
assert.strictEqual(UserRole.ROOT_ADMIN, 'ROOT_ADMIN');
assert.strictEqual(UserRole.CONTENT_SPECIALIST, 'CONTENT_SPECIALIST');
assert.strictEqual(UserRole.SUPPORT, 'SUPPORT');

assert.strictEqual(Difficulty.EASY, 'EASY');
assert.strictEqual(Difficulty.MEDIUM, 'MEDIUM');
assert.strictEqual(Difficulty.HARD, 'HARD');
assert.strictEqual(Difficulty.VERY_HARD, 'VERY_HARD');

assert.strictEqual(QuestionStatus.DRAFT, 'DRAFT');
assert.strictEqual(QuestionStatus.PENDING_REVIEW, 'PENDING_REVIEW');
assert.strictEqual(QuestionStatus.PUBLISHED, 'PUBLISHED');
assert.strictEqual(QuestionStatus.ARCHIVED, 'ARCHIVED');

assert.strictEqual(GameStatus.ACTIVE, 'ACTIVE');
assert.strictEqual(GameStatus.COMPLETED, 'COMPLETED');
assert.strictEqual(GameStatus.ABANDONED, 'ABANDONED');
assert.strictEqual(GameStatus.EXPIRED, 'EXPIRED');

assert.strictEqual(AnswerStatus.PENDING, 'PENDING');
assert.strictEqual(AnswerStatus.CORRECT, 'CORRECT');
assert.strictEqual(AnswerStatus.INCORRECT, 'INCORRECT');
assert.strictEqual(AnswerStatus.TIMED_OUT, 'TIMED_OUT');
assert.strictEqual(AnswerStatus.REVEALED, 'REVEALED');

assert.strictEqual(MatchStatus.WAITING, 'WAITING');
assert.strictEqual(MatchStatus.ACTIVE, 'ACTIVE');
assert.strictEqual(MatchStatus.COMPLETED, 'COMPLETED');
assert.strictEqual(MatchStatus.CANCELLED, 'CANCELLED');

assert.strictEqual(CoinTransactionType.ANSWER_REWARD, 'ANSWER_REWARD');
assert.strictEqual(PrizeType.CASH, 'CASH');
assert.strictEqual(PrizeClaimStatus.PENDING, 'PENDING');
assert.strictEqual(ReportTargetType.USER, 'USER');
assert.strictEqual(ReportStatus.OPEN, 'OPEN');

console.log('✅ ESM runtime import test passed.');

