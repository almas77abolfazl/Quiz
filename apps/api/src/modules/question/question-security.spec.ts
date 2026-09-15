import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole, Difficulty, QuestionStatus, GameStatus, AnswerStatus } from '@quiz/contracts';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { QuizController } from '../quiz/quiz.controller';
import { QuizService } from '../quiz/quiz.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const TEST_JWT_SECRET = 'test-secret-key-for-security-tests-32bytes!';

function recursivelySearchKeys(obj: any, targetKeys: string[], found: string[] = []): string[] {
  if (!obj || typeof obj !== 'object') return found;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      recursivelySearchKeys(item, targetKeys, found);
    }
    return found;
  }
  for (const key of Object.keys(obj)) {
    if (targetKeys.includes(key)) {
      found.push(key);
    }
    recursivelySearchKeys(obj[key], targetKeys, found);
  }
  return found;
}

describe('Phase 2A API Security & Answer Leakage (Integration)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let rootAdminToken: string;
  let contentSpecialistToken: string;
  let playerToken: string;

  const mockAdminQuestion = {
    id: 'q-101',
    text: 'What is 2 + 2?',
    explanation: 'Basic math',
    difficulty: Difficulty.EASY,
    status: QuestionStatus.PUBLISHED,
    imageKey: null,
    options: [
      { id: 'opt-1', text: '3', sortOrder: 1, isCorrect: false },
      { id: 'opt-2', text: '4', sortOrder: 2, isCorrect: true },
    ],
    categories: [{ categoryId: 'cat-1' }],
    tags: [{ tagId: 'tag-1' }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockQuestionService = {
    findAll: jest.fn().mockResolvedValue([mockAdminQuestion]),
    findOne: jest.fn().mockResolvedValue(mockAdminQuestion),
    create: jest.fn().mockResolvedValue(mockAdminQuestion),
    update: jest.fn().mockResolvedValue(mockAdminQuestion),
    publish: jest.fn().mockResolvedValue(mockAdminQuestion),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockQuizService = {
    startQuiz: jest.fn().mockImplementation(async (userId: string, dto: any) => {
      return {
        id: 'quiz-sess-1',
        userId,
        categoryId: dto.categoryId ?? null,
        difficulty: dto.difficulty ?? Difficulty.EASY,
        status: GameStatus.ACTIVE,
        startedAt: '2026-01-01T00:00:00.000Z',
        questions: [
          {
            id: 'sess-q-1',
            questionId: mockAdminQuestion.id,
            position: 1,
            startsAt: '2026-01-01T00:00:00.000Z',
            deadlineAt: '2026-01-01T00:00:30.000Z',
            question: {
              id: mockAdminQuestion.id,
              text: mockAdminQuestion.text,
              difficulty: mockAdminQuestion.difficulty,
              imageUrl: null,
              categoryIds: ['cat-1'],
              options: [
                { id: 'opt-1', text: '3', sortOrder: 1 },
                { id: 'opt-2', text: '4', sortOrder: 2 },
              ],
            },
          },
        ],
      };
    }),
    submitAnswer: jest.fn().mockImplementation(async (userId: string, quizSessionId: string, dto: any) => {
      const isCorrect = dto.selectedOptionId === 'opt-2';
      const status = isCorrect ? AnswerStatus.CORRECT : AnswerStatus.INCORRECT;
      return {
        status,
        isCorrect,
        correctOptionId: 'opt-2',
        feedback: {
          questionId: dto.questionId,
          selectedOptionId: dto.selectedOptionId,
          correctOptionId: 'opt-2',
          isCorrect,
          timedOut: false,
          explanation: mockAdminQuestion.explanation,
          earnedSeasonPoints: isCorrect ? 10 : 0,
          earnedCoins: isCorrect ? 10 : 0,
        },
      };
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [QuestionController, QuizController],
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
        { provide: QuizService, useValue: mockQuizService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jwtService = moduleRef.get(JwtService);

    rootAdminToken = jwtService.sign({ sub: 'admin-user-id', role: UserRole.ROOT_ADMIN });
    contentSpecialistToken = jwtService.sign({ sub: 'cs-user-id', role: UserRole.CONTENT_SPECIALIST });
    playerToken = jwtService.sign({ sub: 'player-user-id', role: UserRole.PLAYER });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authorization Checks on Admin Question Endpoints', () => {
    it('1. Rejects unauthenticated caller with 401 on GET /questions', async () => {
      await request(app.getHttpServer())
        .get('/questions')
        .expect(401);
    });

    it('1b. Rejects unauthenticated caller with 401 on GET /questions/:id', async () => {
      await request(app.getHttpServer())
        .get('/questions/q-101')
        .expect(401);
    });

    it('2. Rejects normal player with 403 on GET /questions', async () => {
      await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('2b. Rejects normal player with 403 on GET /questions/:id', async () => {
      await request(app.getHttpServer())
        .get('/questions/q-101')
        .set('Authorization', `Bearer ${playerToken}`)
        .expect(403);
    });

    it('3. Allows ROOT_ADMIN to access GET /questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('q-101');
      expect(res.body[0].options[1].isCorrect).toBe(true);
    });

    it('3b. Allows CONTENT_SPECIALIST to access GET /questions/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/questions/q-101')
        .set('Authorization', `Bearer ${contentSpecialistToken}`)
        .expect(200);

      expect(res.body.id).toBe('q-101');
      expect(res.body.options[1].isCorrect).toBe(true);
    });
  });

  describe('Pre-Answer Question Leakage Prevention', () => {
    it('4. Starting quiz returns player-safe payload with NO correct-answer indicators anywhere in response', async () => {
      const res = await request(app.getHttpServer())
        .post('/quiz/start')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ categoryId: 'cat-1', difficulty: Difficulty.EASY })
        .expect(201);

      const forbiddenKeys = ['isCorrect', 'correctOptionId', 'correctIndex', 'answerKey'];
      const foundForbiddenKeys = recursivelySearchKeys(res.body, forbiddenKeys);
      expect(foundForbiddenKeys).toEqual([]);

      const options = res.body.questions[0].question.options;
      expect(Array.isArray(options)).toBe(true);
      for (const opt of options) {
        expect(Object.keys(opt).sort()).toEqual(['id', 'sortOrder', 'text']);
        expect('isCorrect' in opt).toBe(false);
      }
    });

    it('6 & 7. Quiz start response does NOT include AnswerFeedbackDto before answer submission', async () => {
      const res = await request(app.getHttpServer())
        .post('/quiz/start')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({})
        .expect(201);

      expect(res.body.feedback).toBeUndefined();
      expect(res.body.correctOptionId).toBeUndefined();
    });
  });

  describe('Post-Answer Feedback Disclosures', () => {
    it('5. Submitting an answer returns valid AnswerFeedbackDto only after processing', async () => {
      const res = await request(app.getHttpServer())
        .post('/quiz/quiz-sess-1/answer')
        .set('Authorization', `Bearer ${playerToken}`)
        .send({ questionId: 'q-101', selectedOptionId: 'opt-2' })
        .expect(201);

      expect(res.body.feedback).toBeDefined();
      const feedback = res.body.feedback;
      expect(feedback.questionId).toBe('q-101');
      expect(feedback.selectedOptionId).toBe('opt-2');
      expect(feedback.correctOptionId).toBe('opt-2');
      expect(feedback.isCorrect).toBe(true);
      expect(feedback.timedOut).toBe(false);
      expect(feedback.explanation).toBe('Basic math');
      expect(feedback.earnedSeasonPoints).toBe(10);
      expect(feedback.earnedCoins).toBe(10);
    });
  });
});

