import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { CoinTransactionType } from '@quiz/contracts';

@Injectable()
export class SeasonService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.season.findMany({
      orderBy: [{ jalaliYear: 'desc' }, { jalaliMonth: 'desc' }],
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarKey: true,
              },
            },
            prizeClaim: true,
          },
        },
        prizes: true,
      },
    });
  }

  async findActive() {
    const season = await this.prisma.season.findFirst({
      where: { isActive: true },
      include: {
        prizes: true,
        entries: {
          orderBy: { score: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarKey: true,
                role: true,
              },
            },
            prizeClaim: true,
          },
        },
      },
    });
    if (!season) throw new NotFoundException('No active season');
    return season;
  }

  async create(dto: CreateSeasonDto) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.season.create({
      data: {
        jalaliYear: dto.jalaliYear,
        jalaliMonth: dto.jalaliMonth,
        startsAt,
        endsAt,
        isActive: dto.isActive ?? false,
      },
    });
  }

  async activate(seasonId: string) {
    const season = await this.prisma.season.findFirst({
      where: { id: seasonId },
    });
    if (!season) throw new NotFoundException('Season not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.season.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      await tx.season.update({
        where: { id: seasonId },
        data: { isActive: true },
      });
    });

    return this.prisma.season.findFirst({ where: { id: seasonId } });
  }

  async getRanking(seasonId: string) {
    const season = await this.prisma.season.findFirst({
      where: { id: seasonId },
    });
    if (!season) throw new NotFoundException('Season not found');

    const entries = await this.prisma.seasonEntry.findMany({
      where: { seasonId },
      orderBy: { score: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarKey: true,
          },
        },
        prizeClaim: true,
      },
    });

    const ranked = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return {
      season,
      entries: ranked,
    };
  }

  async getMyEntry(seasonId: string, userId: string) {
    const entry = await this.prisma.seasonEntry.findFirst({
      where: { seasonId, userId },
      include: {
        season: { include: { prizes: true } },
        prizeClaim: true,
      },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }

  async claimPrize(seasonEntryId: string) {
    const entry = await this.prisma.seasonEntry.findFirst({
      where: { id: seasonEntryId },
      include: { prizeClaim: true, season: { include: { prizes: true } } },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.prizeClaim) return entry.prizeClaim;

    const matchingPrize = entry.season.prizes.find((p) => p.rank === entry.rank);
    if (!matchingPrize) throw new BadRequestException('No prize for this rank');

    return this.prisma.prizeClaim.create({
      data: {
        seasonEntryId,
        status: 'PENDING',
      },
    });
  }
}
