import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoinService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactionHistory(userId: string, limit = 20, offset = 0) {
    const [transactions, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.coinTransaction.count({ where: { userId } }),
    ]);

    return {
      items: transactions,
      total,
      limit,
      offset,
    };
  }
}
