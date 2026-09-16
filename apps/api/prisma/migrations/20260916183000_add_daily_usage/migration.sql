-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "isRanked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" VARCHAR(10) NOT NULL,
    "soloRankedCount" INTEGER NOT NULL DEFAULT 0,
    "matchRankedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_dateKey_key" ON "DailyUsage"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "DailyUsage_userId_dateKey_idx" ON "DailyUsage"("userId", "dateKey");

-- AddForeignKey
ALTER TABLE "DailyUsage" ADD CONSTRAINT "DailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

