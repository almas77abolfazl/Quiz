import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { MatchGateway } from './match.gateway';
import { MatchmakingQueue } from './matchmaking-queue';
import { MatchTimerService } from './match-timer.service';
import { MatchPresenceService } from './match-presence.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MatchController],
  providers: [
    MatchService,
    MatchGateway,
    MatchmakingQueue,
    MatchTimerService,
    MatchPresenceService,
  ],
  exports: [MatchService, MatchmakingQueue, MatchTimerService, MatchPresenceService],
})
export class MatchModule {}
