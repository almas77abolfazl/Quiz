-- AlterTable
ALTER TABLE "CoinTransaction" ADD COLUMN "idempotencyKey" VARCHAR(100);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "settledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN "settledAt" TIMESTAMP(3),
ADD COLUMN "seasonPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isRanked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "CoinTransaction_idempotencyKey_key" ON "CoinTransaction"("idempotencyKey");

