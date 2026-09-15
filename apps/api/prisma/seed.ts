import { PrismaClient, QuestionStatus } from '@prisma/client';
import { SEED_USERS } from './fixtures/users';
import { SEED_CATEGORIES } from './fixtures/categories';
import { getActiveDevelopmentSeason } from './fixtures/season';
import { SEED_QUESTIONS } from './fixtures/questions';

const prisma = new PrismaClient();

async function main() {
  // 1. Production Safety Guard
  const env = process.env.NODE_ENV;
  const dbUrl = process.env.DATABASE_URL || '';

  if (env === 'production' || dbUrl.includes('prod') || dbUrl.includes('production')) {
    console.error('FATAL: Database seed operation is strictly disallowed in production environment!');
    process.exit(1);
  }

  console.log('🌱 Starting development database seed...');

  // 2. Seed Users
  const contentAuthorId = SEED_USERS.find((u) => u.role === 'CONTENT_SPECIALIST')?.id;
  const rootAdminId = SEED_USERS.find((u) => u.role === 'ROOT_ADMIN')?.id;

  if (!contentAuthorId || !rootAdminId) {
    throw new Error('Required seed user roles missing in fixtures.');
  }

  let userCount = 0;
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        coins: user.coins ?? 0,
        dailyStreak: user.dailyStreak ?? 0,
      },
      update: {
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        coins: user.coins ?? 0,
        dailyStreak: user.dailyStreak ?? 0,
      },
    });
    userCount++;
  }

  // 3. Seed Categories
  let categoryCount = 0;
  for (const cat of SEED_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        title: cat.title,
        description: cat.description,
        coverKey: cat.coverKey,
        isActive: cat.isActive,
      },
      update: {
        title: cat.title,
        description: cat.description,
        coverKey: cat.coverKey,
        isActive: cat.isActive,
      },
    });
    categoryCount++;
  }

  // 4. Seed Active Season & Non-cash Prizes (dynamically updated for current Jalali month)
  const activeSeason = getActiveDevelopmentSeason();

  await prisma.season.upsert({
    where: { id: activeSeason.id },
    create: {
      id: activeSeason.id,
      jalaliYear: activeSeason.jalaliYear,
      jalaliMonth: activeSeason.jalaliMonth,
      startsAt: activeSeason.startsAt,
      endsAt: activeSeason.endsAt,
      isActive: activeSeason.isActive,
    },
    update: {
      jalaliYear: activeSeason.jalaliYear,
      jalaliMonth: activeSeason.jalaliMonth,
      startsAt: activeSeason.startsAt,
      endsAt: activeSeason.endsAt,
      isActive: activeSeason.isActive,
    },
  });

  for (const prize of activeSeason.prizes) {
    await prisma.seasonPrize.upsert({
      where: { id: prize.id },
      create: {
        id: prize.id,
        seasonId: activeSeason.id,
        rank: prize.rank,
        type: prize.type,
        title: prize.title,
        description: prize.description,
        coinAmount: prize.coinAmount,
      },
      update: {
        seasonId: activeSeason.id,
        rank: prize.rank,
        type: prize.type,
        title: prize.title,
        description: prize.description,
        coinAmount: prize.coinAmount,
      },
    });
  }

  // 5. Seed Questions, Options, and Category Links
  let questionCount = 0;
  const statusCounts: Record<QuestionStatus, number> = {
    [QuestionStatus.PUBLISHED]: 0,
    [QuestionStatus.DRAFT]: 0,
    [QuestionStatus.PENDING_REVIEW]: 0,
    [QuestionStatus.ARCHIVED]: 0,
  };

  const catDiffBreakdown: Record<string, Record<string, number>> = {};

  for (const q of SEED_QUESTIONS) {
    const isPublished = q.status === QuestionStatus.PUBLISHED;
    const isPending = q.status === QuestionStatus.PENDING_REVIEW;
    const reviewerId = isPublished || isPending ? rootAdminId : null;
    const publishedAt = isPublished ? new Date() : null;

    // Upsert Question
    await prisma.question.upsert({
      where: { id: q.id },
      create: {
        id: q.id,
        text: q.text,
        explanation: q.explanation,
        difficulty: q.difficulty,
        status: q.status,
        authoredById: contentAuthorId,
        reviewedById: reviewerId,
        publishedAt: publishedAt,
      },
      update: {
        text: q.text,
        explanation: q.explanation,
        difficulty: q.difficulty,
        status: q.status,
        authoredById: contentAuthorId,
        reviewedById: reviewerId,
        publishedAt: publishedAt,
      },
    });

    // Upsert Options
    for (const opt of q.options) {
      await prisma.questionOption.upsert({
        where: { id: opt.id },
        create: {
          id: opt.id,
          questionId: q.id,
          text: opt.text,
          sortOrder: opt.sortOrder,
          isCorrect: opt.isCorrect,
        },
        update: {
          questionId: q.id,
          text: opt.text,
          sortOrder: opt.sortOrder,
          isCorrect: opt.isCorrect,
        },
      });
    }

    // Link Category
    await prisma.questionCategory.upsert({
      where: {
        questionId_categoryId: {
          questionId: q.id,
          categoryId: q.categoryId,
        },
      },
      create: {
        questionId: q.id,
        categoryId: q.categoryId,
      },
      update: {},
    });

    questionCount++;
    statusCounts[q.status]++;

    const catObj = SEED_CATEGORIES.find((c) => c.id === q.categoryId);
    const catTitle = catObj ? catObj.title : q.categoryId;
    if (!catDiffBreakdown[catTitle]) {
      catDiffBreakdown[catTitle] = {};
    }
    catDiffBreakdown[catTitle][q.difficulty] = (catDiffBreakdown[catTitle][q.difficulty] || 0) + 1;
  }

  console.log('✅ Seed completed successfully!');
  console.log(`- Users processed: ${userCount}`);
  console.log(`- Categories processed: ${categoryCount}`);
  console.log(`- Active Season: Jalali ${activeSeason.jalaliYear}/${activeSeason.jalaliMonth} (startsAt: ${activeSeason.startsAt.toISOString()}, endsAt: ${activeSeason.endsAt.toISOString()}) with ${activeSeason.prizes.length} prizes`);
  console.log(`- Questions processed: ${questionCount}`);
  console.log(`- Question Status Counts: PUBLISHED=${statusCounts.PUBLISHED}, DRAFT=${statusCounts.DRAFT}, PENDING_REVIEW=${statusCounts.PENDING_REVIEW}`);
  console.log('- Category & Difficulty Distribution:');
  for (const [cat, diffs] of Object.entries(catDiffBreakdown)) {
    console.log(`  * ${cat}: ${JSON.stringify(diffs)}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
