import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole, Difficulty, QuestionStatus, AdminQuestionDto } from '@quiz/contracts';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { mapToAdminQuestionDto } from './question.mapper';

const TEST_JWT_SECRET = 'test-secret-key-for-admin-list-spec-32bytes!';

describe('Phase 4B-1: Admin Questions Management-List API', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let questionService: QuestionService;

  let rootAdminToken: string;
  let contentSpecialistToken: string;
  let supportToken: string;
  let playerToken: string;

  // Generate 80 mock questions: 64 PUBLISHED, 8 DRAFT, 8 PENDING_REVIEW
  const mockDbQuestions = Array.from({ length: 80 }, (_, i) => {
    const id = `00000000-0000-4000-d000-${String(i + 1).padStart(12, '0')}`;
    let status = QuestionStatus.PUBLISHED;
    if (i >= 64 && i < 72) status = QuestionStatus.DRAFT;
    if (i >= 72) status = QuestionStatus.PENDING_REVIEW;

    let difficulty = Difficulty.EASY;
    if (i % 4 === 1) difficulty = Difficulty.MEDIUM;
    if (i % 4 === 2) difficulty = Difficulty.HARD;
    if (i % 4 === 3) difficulty = Difficulty.VERY_HARD;

    const categoryId = `cat-${(i % 4) + 1}`;
    const isPersianTarget = i === 10;
    const text = isPersianTarget ? 'سوال درباره تاریخ ایران' : `Test question ${i + 1} text`;

    return {
      id,
      text,
      explanation: `Explanation ${i + 1}`,
      imageKey: null,
      difficulty,
      status,
      authoredById: 'cs-user-id',
      reviewedById: status === QuestionStatus.PUBLISHED ? 'admin-user-id' : null,
      publishedAt: status === QuestionStatus.PUBLISHED ? new Date('2026-01-01') : null,
      createdAt: new Date(1700000000000 + i * 1000), // increasing createdAt
      updatedAt: new Date(1700000000000 + i * 1000),
      archivedAt: null,
      deletedAt: null,
      options: [
        { id: `opt-${i}-1`, questionId: id, text: 'Option 1', sortOrder: 1, isCorrect: true },
        { id: `opt-${i}-2`, questionId: id, text: 'Option 2', sortOrder: 2, isCorrect: false },
        { id: `opt-${i}-3`, questionId: id, text: 'Option 3', sortOrder: 3, isCorrect: false },
        { id: `opt-${i}-4`, questionId: id, text: 'Option 4', sortOrder: 4, isCorrect: false },
      ],
      categories: [{ questionId: id, categoryId, category: { id: categoryId, title: `Category ${categoryId}` } }],
      tags: [],
    };
  });

  const mockPrismaService = {
    question: {
      count: jest.fn().mockImplementation(async (args?: any) => {
        const where = args?.where ?? {};
        let filtered = mockDbQuestions.filter((q) => q.deletedAt === null);

        if (where.status) {
          filtered = filtered.filter((q) => q.status === where.status);
        }
        if (where.difficulty) {
          filtered = filtered.filter((q) => q.difficulty === where.difficulty);
        }
        if (where.categories?.some?.categoryId) {
          const targetCat = where.categories.some.categoryId;
          filtered = filtered.filter((q) => q.categories.some((c) => c.categoryId === targetCat));
        }
        if (where.text?.contains) {
          const searchStr = where.text.contains.toLowerCase();
          filtered = filtered.filter((q) => q.text.toLowerCase().includes(searchStr));
        }
        return filtered.length;
      }),
      findMany: jest.fn().mockImplementation(async (args?: any) => {
        const where = args?.where ?? {};
        let filtered = mockDbQuestions.filter((q) => q.deletedAt === null);

        if (where.status) {
          filtered = filtered.filter((q) => q.status === where.status);
        }
        if (where.difficulty) {
          filtered = filtered.filter((q) => q.difficulty === where.difficulty);
        }
        if (where.categories?.some?.categoryId) {
          const targetCat = where.categories.some.categoryId;
          filtered = filtered.filter((q) => q.categories.some((c) => c.categoryId === targetCat));
        }
        if (where.text?.contains) {
          const searchStr = where.text.contains.toLowerCase();
          filtered = filtered.filter((q) => q.text.toLowerCase().includes(searchStr));
        }

        // orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]
        if (args?.orderBy) {
          filtered.sort((a, b) => {
            const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.id.localeCompare(b.id);
          });
        }

        const skip = args?.skip ?? 0;
        const take = args?.take ?? 20;
        return filtered.slice(skip, skip + take);
      }),
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [QuestionController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
              throw new Error(`Unexpected ConfigKey: ${key}`);
            },
          },
        },
        AccessTokenGuard,
        RolesGuard,
        QuestionService,
        { provide: 'PrismaService', useValue: mockPrismaService },
      ],
    })
      .overrideProvider(QuestionService)
      .useValue(new QuestionService(mockPrismaService as any))
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleRef.get(JwtService);
    questionService = moduleRef.get(QuestionService);

    rootAdminToken = jwtService.sign({ sub: 'admin-1', role: UserRole.ROOT_ADMIN });
    contentSpecialistToken = jwtService.sign({ sub: 'cs-1', role: UserRole.CONTENT_SPECIALIST });
    supportToken = jwtService.sign({ sub: 'support-1', role: UserRole.SUPPORT });
    playerToken = jwtService.sign({ sub: 'player-1', role: UserRole.PLAYER });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication and Role-Based Access Control', () => {
    it('returns 401 for unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/questions').expect(401);
    });

    it('returns 403 for PLAYER role', async () => {
      await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('returns 403 for SUPPORT role', async () => {
      await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(403);
    });

    it('allows ROOT_ADMIN access', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('allows CONTENT_SPECIALIST access', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .expect(200);

      expect(res.body.meta).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Query Parameter Validation (400 Bad Request)', () => {
    it('rejects page < 1 (e.g. page=0)', async () => {
      await request(app.getHttpServer())
        .get('/questions?page=0')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });

    it('rejects negative page (e.g. page=-1)', async () => {
      await request(app.getHttpServer())
        .get('/questions?page=-1')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });

    it('rejects non-integer page (e.g. page=abc)', async () => {
      await request(app.getHttpServer())
        .get('/questions?page=abc')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });

    it('rejects limit < 1 (e.g. limit=0)', async () => {
      await request(app.getHttpServer())
        .get('/questions?limit=0')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });

    it('rejects limit > 100 (e.g. limit=101)', async () => {
      await request(app.getHttpServer())
        .get('/questions?limit=101')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });

    it('rejects invalid difficulty enum', async () => {
      await request(app.getHttpServer())
        .get('/questions?difficulty=SUPER_EXTREME')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });

    it('rejects invalid status enum', async () => {
      await request(app.getHttpServer())
        .get('/questions?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(400);
    });
  });

  describe('3. Default Behavior & No-Filter Results', () => {
    it('returns meta.total = 80 when no filters are supplied (includes all statuses)', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.total).toBe(80);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
      expect(res.body.meta.totalPages).toBe(4);
      expect(res.body.meta.hasPreviousPage).toBe(false);
      expect(res.body.meta.hasNextPage).toBe(true);
      expect(res.body.data.length).toBe(20);
    });
  });

  describe('4. Pagination & Maximum Limit', () => {
    it('supports page and limit parameters (page=2, limit=5)', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?page=2&limit=5')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.limit).toBe(5);
      expect(res.body.meta.total).toBe(80);
      expect(res.body.meta.totalPages).toBe(16);
      expect(res.body.meta.hasPreviousPage).toBe(true);
      expect(res.body.meta.hasNextPage).toBe(true);
      expect(res.body.data.length).toBe(5);
    });

    it('supports max limit = 100', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?limit=100')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.limit).toBe(100);
      expect(res.body.meta.total).toBe(80);
      expect(res.body.meta.totalPages).toBe(1);
      expect(res.body.meta.hasPreviousPage).toBe(false);
      expect(res.body.meta.hasNextPage).toBe(false);
      expect(res.body.data.length).toBe(80);
    });
  });

  describe('5. Search Filtering & Trimming (Persian text support)', () => {
    it('trims leading/trailing whitespace and matches Persian text', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?search=%20%20%D8%A7%DB%8C%D8%B1%D8%A7%D9%86%20%20') // "  ایران  "
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].text).toContain('ایران');
    });

    it('treats blank search (spaces only) as no search filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?search=%20%20%20')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.total).toBe(80);
    });
  });

  describe('6. Specific and Combined Filters', () => {
    it('filters by status = DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?status=DRAFT')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.total).toBe(8);
      for (const item of res.body.data) {
        expect(item.status).toBe(QuestionStatus.DRAFT);
      }
    });

    it('filters by difficulty = HARD', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?difficulty=HARD')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.total).toBe(20);
      for (const item of res.body.data) {
        expect(item.difficulty).toBe(Difficulty.HARD);
      }
    });

    it('filters by categoryId', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?categoryId=cat-1')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.meta.total).toBe(20);
      for (const item of res.body.data) {
        expect(item.categoryIds).toContain('cat-1');
      }
    });

    it('combines multiple filters with AND logic', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?status=PUBLISHED&difficulty=EASY&categoryId=cat-1')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      for (const item of res.body.data) {
        expect(item.status).toBe(QuestionStatus.PUBLISHED);
        expect(item.difficulty).toBe(Difficulty.EASY);
        expect(item.categoryIds).toContain('cat-1');
      }
    });
  });

  describe('7. Ordering & Explicit Admin DTO Mapping', () => {
    it('enforces stable ordering (createdAt desc, then id asc)', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions?limit=100')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      const items = res.body.data;
      for (let i = 0; i < items.length - 1; i++) {
        const timeA = new Date(items[i].createdAt).getTime();
        const timeB = new Date(items[i + 1].createdAt).getTime();
        expect(timeA).toBeGreaterThanOrEqual(timeB);
      }
    });

    it('explicitly maps AdminQuestionDto and includes isCorrect on options without exposing internal DB fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      const q = res.body.data[0];
      expect(q.id).toBeDefined();
      expect(q.text).toBeDefined();
      expect(q.difficulty).toBeDefined();
      expect(q.status).toBeDefined();
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options[0].isCorrect).toBeDefined();
      expect(typeof q.options[0].isCorrect).toBe('boolean');

      // Internal fields must be omitted
      expect(q.deletedAt).toBeUndefined();
      expect(q.archivedAt).toBeUndefined();
      expect(q.authoredById).toBeUndefined();
      expect(q.reviewedById).toBeUndefined();
    });
  });
});

