import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole, Difficulty, QuestionStatus } from '@quiz/contracts';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const TEST_JWT_SECRET = 'test-secret-key-for-question-auth-32bytes!';

describe('Phase 2B Question Publication Authorization (Integration & Unit)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let questionService: QuestionService;

  let rootAdminToken: string;
  let contentSpecialistToken: string;
  let supportToken: string;
  let playerToken: string;

  const mockAdminQuestion = {
    id: 'q-201',
    text: 'Draft question text',
    explanation: 'Draft explanation',
    difficulty: Difficulty.MEDIUM,
    status: QuestionStatus.DRAFT,
    imageKey: null,
    options: [
      { id: 'opt-1', text: 'Option 1', sortOrder: 1, isCorrect: true },
      { id: 'opt-2', text: 'Option 2', sortOrder: 2, isCorrect: false },
    ],
    categories: [{ categoryId: 'cat-1' }],
    tags: [{ tagId: 'tag-1' }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockQuestionService = {
    findAll: jest.fn().mockResolvedValue([mockAdminQuestion]),
    findOne: jest.fn().mockResolvedValue(mockAdminQuestion),
    create: jest.fn().mockImplementation(async (dto: any, authorId: string) => ({
      ...mockAdminQuestion,
      text: dto.text,
      status: QuestionStatus.DRAFT,
    })),
    update: jest.fn().mockImplementation(async (id: string, dto: any, actorRole?: string) => {
      if (dto.status === QuestionStatus.PUBLISHED && actorRole !== UserRole.ROOT_ADMIN) {
        throw new ForbiddenException('Only Root Admin can publish questions');
      }
      return {
        ...mockAdminQuestion,
        ...dto,
        status: dto.status ?? mockAdminQuestion.status,
      };
    }),
    publish: jest.fn().mockImplementation(async (id: string, reviewerId: string, actorRole?: string) => {
      if (actorRole && actorRole !== UserRole.ROOT_ADMIN) {
        throw new ForbiddenException('Only Root Admin can publish questions');
      }
      return {
        ...mockAdminQuestion,
        status: QuestionStatus.PUBLISHED,
      };
    }),
    remove: jest.fn().mockResolvedValue(undefined),
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
        { provide: QuestionService, useValue: mockQuestionService },
      ],
    }).compile();

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

  describe('Explicit Publish Endpoint Authorization (PUT /questions/:id/publish)', () => {
    it('1. Unauthenticated publish request returns 401', async () => {
      await request(app.getHttpServer())
        .put('/questions/q-201/publish')
        .expect(401);
    });

    it('2. PLAYER publish request returns 403', async () => {
      await request(app.getHttpServer())
        .put('/questions/q-201/publish')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('3. SUPPORT publish request returns 403', async () => {
      await request(app.getHttpServer())
        .put('/questions/q-201/publish')
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(403);
    });

    it('4. CONTENT_SPECIALIST publish request returns 403', async () => {
      await request(app.getHttpServer())
        .put('/questions/q-201/publish')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .expect(403);
    });

    it('5 & 13. ROOT_ADMIN publish request reaches handler successfully and publishes', async () => {
      const res = await request(app.getHttpServer())
        .put('/questions/q-201/publish')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(res.body.status).toBe(QuestionStatus.PUBLISHED);
    });
  });

  describe('Draft Creation and Editing Role Boundaries', () => {
    const validCreatePayload = {
      text: 'New question draft?',
      explanation: 'Explanation text',
      difficulty: Difficulty.EASY,
      categoryIds: ['cat-1'],
      questionOptions: [
        { text: 'A', sortOrder: 1, isCorrect: true },
        { text: 'B', sortOrder: 2, isCorrect: false },
      ],
    };

    it('6. CONTENT_SPECIALIST can create a question draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .send(validCreatePayload)
        .expect(201);

      expect(res.body.status).toBe(QuestionStatus.DRAFT);
    });

    it('7. CONTENT_SPECIALIST can edit a question draft', async () => {
      const res = await request(app.getHttpServer())
        .put('/questions/q-201')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .send({ text: 'Updated draft text' })
        .expect(200);

      expect(res.body.text).toBe('Updated draft text');
    });

    it('8. PLAYER cannot create a question', async () => {
      await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${playerToken}`)
        .send(validCreatePayload)
        .expect(403);
    });

    it('9. PLAYER cannot edit a question', async () => {
      await request(app.getHttpServer())
        .put('/questions/q-201')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ text: 'Unauthorized edit' })
        .expect(403);
    });
  });

  describe('Publication Invariant & Bypass Prevention', () => {
    it('10. CONTENT_SPECIALIST supplying unwhitelisted status field in create payload is rejected with 400', async () => {
      const payloadWithStatus = {
        text: 'New question draft?',
        explanation: 'Explanation text',
        difficulty: Difficulty.EASY,
        status: QuestionStatus.PUBLISHED,
        questionOptions: [
          { text: 'A', sortOrder: 1, isCorrect: true },
          { text: 'B', sortOrder: 2, isCorrect: false },
        ],
      };

      await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .send(payloadWithStatus)
        .expect(400);
    });

    it('11. CONTENT_SPECIALIST updating draft to PUBLISHED via PUT /questions/:id returns 403', async () => {
      await request(app.getHttpServer())
        .put('/questions/q-201')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .send({ status: QuestionStatus.PUBLISHED })
        .expect(403);
    });

    it('12. Direct execution of QuestionService.update prevents CONTENT_SPECIALIST from publishing', async () => {
      await expect(
        questionService.update('q-201', { status: QuestionStatus.PUBLISHED }, UserRole.CONTENT_SPECIALIST),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

