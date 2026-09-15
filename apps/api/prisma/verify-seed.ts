import { PrismaClient, QuestionStatus, Difficulty, PrizeType } from '@prisma/client';
import { getActiveDevelopmentSeason, JALALI_MONTH_NAMES } from './fixtures/season';

const prisma = new PrismaClient();

export async function verifySeedData() {
  const env = process.env.NODE_ENV;
  const dbUrl = process.env.DATABASE_URL || '';
  if (env === 'production' || dbUrl.includes('prod') || dbUrl.includes('production')) {
    throw new Error('Verification must not be run against production databases.');
  }

  // 1. Seed-owned User verification
  const seededUsers = await prisma.user.findMany({
    where: { phone: { startsWith: '0912000000' } },
  });
  if (seededUsers.length !== 5) {
    throw new Error(`Expected 5 seeded users, found ${seededUsers.length}`);
  }

  const roles = seededUsers.map((u) => u.role);
  if (!roles.includes('ROOT_ADMIN')) throw new Error('Missing ROOT_ADMIN user');
  if (!roles.includes('CONTENT_SPECIALIST')) throw new Error('Missing CONTENT_SPECIALIST user');
  if (!roles.includes('SUPPORT')) throw new Error('Missing SUPPORT user');
  if (roles.filter((r) => r === 'PLAYER').length !== 2) throw new Error('Expected 2 PLAYER users');

  // 2. Category verification
  const seededCatTitles = ['اطلاعات عمومی', 'تاریخ ایران', 'جغرافیا', 'فناوری'];
  const categories = await prisma.category.findMany({
    where: { title: { in: seededCatTitles } },
  });
  if (categories.length !== 4) {
    throw new Error(`Expected 4 seeded categories, found ${categories.length}`);
  }

  // 3. Question verification
  const questions = await prisma.question.findMany({
    where: { id: { startsWith: '00000000-0000-4000-d000-' } },
    include: {
      options: true,
      categories: { include: { category: true } },
      authoredBy: true,
      reviewedBy: true,
    },
  });

  if (questions.length !== 80) {
    throw new Error(`Expected 80 seed-owned questions, found ${questions.length}`);
  }

  // Check unique question text
  const questionTexts = new Set<string>();
  for (const q of questions) {
    if (questionTexts.has(q.text)) {
      throw new Error(`Duplicate question text found: "${q.text}"`);
    }
    questionTexts.add(q.text);

    if (q.options.length !== 4) {
      throw new Error(`Question ${q.id} has ${q.options.length} options instead of 4`);
    }

    const correctCount = q.options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error(`Question ${q.id} has ${correctCount} correct options instead of 1`);
    }

    if (!q.authoredBy || q.authoredBy.role !== 'CONTENT_SPECIALIST') {
      throw new Error(`Question ${q.id} missing valid CONTENT_SPECIALIST author`);
    }

    if (q.status === QuestionStatus.PUBLISHED || q.status === QuestionStatus.PENDING_REVIEW) {
      if (!q.reviewedBy || q.reviewedBy.role !== 'ROOT_ADMIN') {
        throw new Error(`Question ${q.id} with status ${q.status} missing valid ROOT_ADMIN reviewer`);
      }
    }

    if (q.categories.length !== 1) {
      throw new Error(`Question ${q.id} linked to ${q.categories.length} categories instead of 1`);
    }
  }

  const statusCounts = {
    PUBLISHED: questions.filter((q) => q.status === QuestionStatus.PUBLISHED).length,
    DRAFT: questions.filter((q) => q.status === QuestionStatus.DRAFT).length,
    PENDING_REVIEW: questions.filter((q) => q.status === QuestionStatus.PENDING_REVIEW).length,
  };

  if (statusCounts.PUBLISHED !== 64) {
    throw new Error(`Expected 64 PUBLISHED questions, found ${statusCounts.PUBLISHED}`);
  }
  if (statusCounts.DRAFT !== 8) {
    throw new Error(`Expected 8 DRAFT questions, found ${statusCounts.DRAFT}`);
  }
  if (statusCounts.PENDING_REVIEW !== 8) {
    throw new Error(`Expected 8 PENDING_REVIEW questions, found ${statusCounts.PENDING_REVIEW}`);
  }

  const difficulties: Difficulty[] = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, Difficulty.VERY_HARD];
  for (const cat of categories) {
    for (const diff of difficulties) {
      const matchingPublished = questions.filter(
        (q) =>
          q.categories.some((c) => c.categoryId === cat.id) &&
          q.difficulty === diff &&
          q.status === QuestionStatus.PUBLISHED,
      );
      if (matchingPublished.length < 1) {
        throw new Error(`Category "${cat.title}" has no PUBLISHED questions for difficulty ${diff}`);
      }
    }
  }

  // 4. Options count check
  const totalOptionsCount = await prisma.questionOption.count({
    where: { questionId: { startsWith: '00000000-0000-4000-d000-' } },
  });
  if (totalOptionsCount !== 320) {
    throw new Error(`Expected 320 total options (80 * 4), found ${totalOptionsCount}`);
  }

  // 5. QuestionCategory join count check
  const totalQCJoinCount = await prisma.questionCategory.count({
    where: { questionId: { startsWith: '00000000-0000-4000-d000-' } },
  });
  if (totalQCJoinCount !== 80) {
    throw new Error(`Expected 80 QuestionCategory links, found ${totalQCJoinCount}`);
  }

  // 6. Active Season & Prizes Verification (Persisted DB query)
  const seedSeasons = await prisma.season.findMany({
    where: { id: '00000000-0000-4000-c000-000000000001' },
    include: { prizes: true },
  });

  if (seedSeasons.length !== 1) {
    throw new Error(`Expected exactly 1 seed-owned season, found ${seedSeasons.length}`);
  }

  const season = seedSeasons[0];
  const expectedSeason = getActiveDevelopmentSeason();

  if (!season.isActive) {
    throw new Error('Seed-owned season is not marked as active (isActive = false)');
  }

  // Verify system time falls inside active date range
  const now = new Date();
  if (now < season.startsAt || now > season.endsAt) {
    throw new Error(
      `Current time (${now.toISOString()}) is outside active season range (${season.startsAt.toISOString()} to ${season.endsAt.toISOString()})`,
    );
  }

  // Verify Jalali year & month match calculated current values
  if (season.jalaliYear !== expectedSeason.jalaliYear || season.jalaliMonth !== expectedSeason.jalaliMonth) {
    throw new Error(
      `Season Jalali period (${season.jalaliYear}/${season.jalaliMonth}) does not match expected current period (${expectedSeason.jalaliYear}/${expectedSeason.jalaliMonth})`,
    );
  }

  // Verify Prizes (exactly 4 non-cash prizes)
  if (season.prizes.length !== 4) {
    throw new Error(`Expected exactly 4 seed-owned season prizes, found ${season.prizes.length}`);
  }

  for (const prize of season.prizes) {
    if (prize.type === PrizeType.CASH || prize.type === PrizeType.PHYSICAL_ITEM) {
      throw new Error(`Invalid prize type ${prize.type} found in seed data (only non-cash prizes allowed)`);
    }

    const expectedMonthName = JALALI_MONTH_NAMES[season.jalaliMonth];
    if (!prize.title.includes(expectedMonthName) || !prize.title.includes(season.jalaliYear.toString())) {
      throw new Error(`Prize title "${prize.title}" does not contain expected Jalali period "${expectedMonthName} ${season.jalaliYear}"`);
    }
  }

  // Also verify API selection query finds this season
  const activeViaApiQuery = await prisma.season.findFirst({
    where: { isActive: true },
  });
  if (!activeViaApiQuery || activeViaApiQuery.id !== season.id) {
    throw new Error('API active season query (isActive: true) failed to resolve the seed-owned season');
  }

  return {
    seededUsers: seededUsers.length,
    seededCategories: categories.length,
    seededQuestions: questions.length,
    totalOptions: totalOptionsCount,
    questionCategories: totalQCJoinCount,
    seedOwnedActiveSeasons: seedSeasons.length,
    seedOwnedPrizes: season.prizes.length,
    currentJalaliYear: season.jalaliYear,
    currentJalaliMonth: season.jalaliMonth,
    startsAt: season.startsAt.toISOString(),
    endsAt: season.endsAt.toISOString(),
    statusCounts,
  };
}

if (require.main === module) {
  verifySeedData()
    .then((res) => {
      console.log('✅ Seed verification PASSED!');
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error('❌ Seed verification FAILED:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
