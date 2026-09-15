-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ROOT_ADMIN', 'CONTENT_SPECIALIST', 'SUPPORT');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'VERY_HARD');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('PENDING', 'CORRECT', 'INCORRECT', 'TIMED_OUT', 'REVEALED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('ANSWER_REWARD', 'GAME_COMPLETION', 'MATCH_REWARD', 'MISSION_REWARD', 'QUESTION_SUGGESTION_REWARD', 'SEASON_REWARD', 'PURCHASE', 'SPEND_HINT', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PrizeType" AS ENUM ('CASH', 'PHYSICAL_ITEM', 'COINS', 'BADGE', 'PROFILE_BANNER', 'TITLE');

-- CreateEnum
CREATE TYPE "PrizeClaimStatus" AS ENUM ('PENDING', 'CONTACTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'QUESTION', 'QUESTION_SUGGESTION');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "username" VARCHAR(32),
    "displayName" VARCHAR(48),
    "avatarKey" VARCHAR(100),
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "coins" INTEGER NOT NULL DEFAULT 0,
    "dailyStreak" INTEGER NOT NULL DEFAULT 0,
    "lastDailyActivityAt" TIMESTAMP(3),
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsernameHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "coverKey" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryFollow" (
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryFollow_pkey" PRIMARY KEY ("userId","categoryId")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "imageKey" VARCHAR(200),
    "difficulty" "Difficulty" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "authoredById" TEXT,
    "reviewedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "questionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("questionId","categoryId")
);

-- CreateTable
CREATE TABLE "QuestionTag" (
    "questionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("questionId","tagId")
);

-- CreateTable
CREATE TABLE "QuestionSuggestion" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "proposedLevel" "Difficulty",
    "note" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "publishedQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "jalaliYear" INTEGER NOT NULL,
    "jalaliMonth" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonEntry" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "matchWins" INTEGER NOT NULL DEFAULT 0,
    "reachedScoreAt" TIMESTAMP(3),
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonPrize" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "type" "PrizeType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "coinAmount" INTEGER,
    "imageKey" VARCHAR(200),

    CONSTRAINT "SeasonPrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeClaim" (
    "id" TEXT NOT NULL,
    "seasonEntryId" TEXT NOT NULL,
    "status" "PrizeClaimStatus" NOT NULL DEFAULT 'PENDING',
    "internalNote" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CoinTransactionType" NOT NULL,
    "referenceType" VARCHAR(50),
    "referenceId" VARCHAR(100),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "difficulty" "Difficulty",
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "countedForDaily" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSessionQuestion" (
    "id" TEXT NOT NULL,
    "quizSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "position" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),
    "status" "AnswerStatus" NOT NULL DEFAULT 'PENDING',
    "hintUsed" TEXT,

    CONSTRAINT "QuizSessionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "difficulty" "Difficulty",
    "status" "MatchStatus" NOT NULL DEFAULT 'WAITING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "coinReward" INTEGER NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchQuestion" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchAnswer" (
    "id" TEXT NOT NULL,
    "matchQuestionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "answeredAt" TIMESTAMP(3),
    "status" "AnswerStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "MatchAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_userId_createdAt_idx" ON "OtpChallenge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsernameHistory_userId_changedAt_idx" ON "UsernameHistory"("userId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_title_key" ON "Category"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_title_key" ON "Tag"("title");

-- CreateIndex
CREATE INDEX "Question_status_difficulty_idx" ON "Question"("status", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_sortOrder_key" ON "QuestionOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuestionCategory_categoryId_idx" ON "QuestionCategory"("categoryId");

-- CreateIndex
CREATE INDEX "QuestionTag_tagId_idx" ON "QuestionTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSuggestion_publishedQuestionId_key" ON "QuestionSuggestion"("publishedQuestionId");

-- CreateIndex
CREATE INDEX "QuestionSuggestion_status_createdAt_idx" ON "QuestionSuggestion"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Season_jalaliYear_jalaliMonth_key" ON "Season"("jalaliYear", "jalaliMonth");

-- CreateIndex
CREATE INDEX "SeasonEntry_seasonId_score_idx" ON "SeasonEntry"("seasonId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonEntry_seasonId_userId_key" ON "SeasonEntry"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPrize_seasonId_rank_type_key" ON "SeasonPrize"("seasonId", "rank", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_seasonEntryId_key" ON "PrizeClaim"("seasonEntryId");

-- CreateIndex
CREATE INDEX "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizSession_userId_startedAt_idx" ON "QuizSession"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSessionQuestion_quizSessionId_position_key" ON "QuizSessionQuestion"("quizSessionId", "position");

-- CreateIndex
CREATE INDEX "Match_status_createdAt_idx" ON "Match"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_idx" ON "MatchParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "MatchParticipant"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchQuestion_matchId_position_key" ON "MatchQuestion"("matchId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnswer_matchQuestionId_participantId_key" ON "MatchAnswer"("matchQuestionId", "participantId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsernameHistory" ADD CONSTRAINT "UsernameHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryFollow" ADD CONSTRAINT "CategoryFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryFollow" ADD CONSTRAINT "CategoryFollow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authoredById_fkey" FOREIGN KEY ("authoredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSuggestion" ADD CONSTRAINT "QuestionSuggestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonEntry" ADD CONSTRAINT "SeasonEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonEntry" ADD CONSTRAINT "SeasonEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonPrize" ADD CONSTRAINT "SeasonPrize_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_seasonEntryId_fkey" FOREIGN KEY ("seasonEntryId") REFERENCES "SeasonEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSessionQuestion" ADD CONSTRAINT "QuizSessionQuestion_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSessionQuestion" ADD CONSTRAINT "QuizSessionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSessionQuestion" ADD CONSTRAINT "QuizSessionQuestion_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestion" ADD CONSTRAINT "MatchQuestion_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestion" ADD CONSTRAINT "MatchQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAnswer" ADD CONSTRAINT "MatchAnswer_matchQuestionId_fkey" FOREIGN KEY ("matchQuestionId") REFERENCES "MatchQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAnswer" ADD CONSTRAINT "MatchAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

