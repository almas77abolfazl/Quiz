import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole } from '@quiz/contracts';
import { SeasonController } from './season.controller';
import { SeasonService } from './season.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const TEST_JWT_SECRET = 'test-secret-key-for-season-claim-32bytes!';

describe('Phase 2B Season Prize Claim Authorization (Integration & Service)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let rootAdminToken: string;
  let player1Token: string;
  let player2Token: string;

  const mockSeasonEntries: Record<string, any> = {
    'entry-owner-1': {
      id: 'entry-owner-1',
      seasonId: 'season-1',
      userId: 'player-1-id',
      score: 100,
      rank: 1,
      season: {
        id: 'season-1',
        prizes: [{ id: 'prize-1', rank: 1, title: 'Gold Medal', type: 'CASH' }],
      },
      prizeClaim: null,
    },
    'entry-owner-2': {
      id: 'entry-owner-2',
      seasonId: 'season-1',
      userId: 'player-2-id',
      score: 90,
      rank: 2,
      season: {
        id: 'season-1',
        prizes: [{ id: 'prize-2', rank: 2, title: 'Silver Medal', type: 'CASH' }],
      },
      prizeClaim: null,
    },
    'entry-already-claimed': {
      id: 'entry-already-claimed',
      seasonId: 'season-1',
      userId: 'player-1-id',
      score: 100,
      rank: 1,
      season: {
        id: 'season-1',
        prizes: [{ id: 'prize-1', rank: 1, title: 'Gold Medal', type: 'CASH' }],
      },
      prizeClaim: {
        id: 'claim-existing-1',
        seasonEntryId: 'entry-already-claimed',
        status: 'PENDING',
      },
    },
    'entry-no-prize': {
      id: 'entry-no-prize',
      seasonId: 'season-1',
      userId: 'player-1-id',
      score: 10,
      rank: 50,
      season: {
        id: 'season-1',
        prizes: [{ id: 'prize-1', rank: 1, title: 'Gold Medal', type: 'CASH' }],
      },
      prizeClaim: null,
    },
  };

  const createdClaims: Record<string, any> = {};

  const mockSeasonService = {
    claimPrize: jest.fn().mockImplementation(async (seasonEntryId: string, authenticatedUserId: string) => {
      const entry = mockSeasonEntries[seasonEntryId];
      if (!entry) {
        throw new NotFoundException('Season entry not found');
      }

      if (entry.userId !== authenticatedUserId) {
        throw new ForbiddenException('You are not authorized to claim this prize');
      }

      if (entry.prizeClaim) {
        return entry.prizeClaim;
      }

      if (createdClaims[seasonEntryId]) {
        return createdClaims[seasonEntryId];
      }

      const matchingPrize = entry.season.prizes.find((p: any) => p.rank === entry.rank);
      if (!matchingPrize) {
        throw new BadRequestException('No prize for this rank');
      }

      const newClaim = {
        id: `claim-${Date.now()}`,
        seasonEntryId,
        status: 'PENDING',
      };
      createdClaims[seasonEntryId] = newClaim;
      return newClaim;
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
      controllers: [SeasonController],
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
        { provide: SeasonService, useValue: mockSeasonService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jwtService = moduleRef.get(JwtService);

    rootAdminToken = jwtService.sign({ sub: 'admin-1-id', role: UserRole.ROOT_ADMIN });
    player1Token = jwtService.sign({ sub: 'player-1-id', role: UserRole.PLAYER });
    player2Token = jwtService.sign({ sub: 'player-2-id', role: UserRole.PLAYER });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Season Prize Claim Ownership & Security', () => {
    it('1. Unauthenticated claim request returns 401', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/entry-owner-1/claim')
        .expect(401);
    });

    it('2. Owner player can claim their own SeasonEntry', async () => {
      const res = await request(app.getHttpServer())
        .post('/seasons/entries/entry-owner-1/claim')
        .set('Authorization', `Bearer ${player1Token}`)
        .expect(201);

      expect(res.body.seasonEntryId).toBe('entry-owner-1');
      expect(res.body.status).toBe('PENDING');
    });

    it('3. Player cannot claim another player’s SeasonEntry (returns 403)', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/entry-owner-2/claim')
        .set('Authorization', `Bearer ${player1Token}`)
        .expect(403);
    });

    it('4. Body userId impersonation is ignored (returns 403 if claiming foreign entry)', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/entry-owner-2/claim')
        .set('Authorization', `Bearer ${player1Token}`)
        .send({ userId: 'player-2-id' })
        .expect(403);
    });

    it('5. Query userId impersonation is ignored (returns 403 if claiming foreign entry)', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/entry-owner-2/claim?userId=player-2-id')
        .set('Authorization', `Bearer ${player1Token}`)
        .expect(403);
    });

    it('6. ROOT_ADMIN receives no ownership bypass through player claim endpoint (returns 403 for foreign entry)', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/entry-owner-2/claim')
        .set('Authorization', `Bearer ${rootAdminToken}`)
        .expect(403);
    });

    it('7. Claiming a nonexistent SeasonEntry returns 404', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/nonexistent-entry/claim')
        .set('Authorization', `Bearer ${player1Token}`)
        .expect(404);
    });

    it('8. Repeated claim behaves deterministically and returns existing claim', async () => {
      const res = await request(app.getHttpServer())
        .post('/seasons/entries/entry-already-claimed/claim')
        .set('Authorization', `Bearer ${player1Token}`)
        .expect(201);

      expect(res.body.id).toBe('claim-existing-1');
    });

    it('9. Claiming entry with no configured prize for rank returns 400', async () => {
      await request(app.getHttpServer())
        .post('/seasons/entries/entry-no-prize/claim')
        .set('Authorization', `Bearer ${player1Token}`)
        .expect(400);
    });
  });

  describe('Service Concurrency and Error Handling Unit Logic', () => {
    it('10. P2002 error handler catches unique constraint conflict and returns existing claim', async () => {
      const existingClaim = { id: 'claim-p2002', seasonEntryId: 'entry-race', status: 'PENDING' };
      const servicePrismaMock = {
        seasonEntry: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'entry-race',
            userId: 'player-1-id',
            rank: 1,
            season: { prizes: [{ rank: 1 }] },
            prizeClaim: null,
          }),
        },
        prizeClaim: {
          create: jest.fn().mockRejectedValue({ code: 'P2002' }),
          findUnique: jest.fn().mockResolvedValue(existingClaim),
        },
      };

      const seasonService = new SeasonService(servicePrismaMock as any);
      const result = await seasonService.claimPrize('entry-race', 'player-1-id');

      expect(result).toEqual(existingClaim);
      expect(servicePrismaMock.prizeClaim.findUnique).toHaveBeenCalledWith({
        where: { seasonEntryId: 'entry-race' },
      });
    });

    it('11. Unrelated Prisma errors are rethrown and not swallowed as duplicate claims', async () => {
      const servicePrismaMock = {
        seasonEntry: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'entry-db-err',
            userId: 'player-1-id',
            rank: 1,
            season: { prizes: [{ rank: 1 }] },
            prizeClaim: null,
          }),
        },
        prizeClaim: {
          create: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        },
      };

      const seasonService = new SeasonService(servicePrismaMock as any);
      await expect(seasonService.claimPrize('entry-db-err', 'player-1-id')).rejects.toThrow('Database connection failed');
    });
  });
});

