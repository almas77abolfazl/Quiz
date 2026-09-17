-- AlterTable
ALTER TABLE "Match" ADD COLUMN "currentRound" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN "isReady" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MatchQuestion" ADD COLUMN "closedAt" TIMESTAMP(3);

