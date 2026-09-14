import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { Difficulty } from '@quiz/contracts';
import { AuthenticatedRequest } from '../auth/access-token.guard';

@Controller('match')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post('join')
  @UseGuards(AccessTokenGuard)
  join(
    @Body() body: { categoryId?: string; difficulty?: Difficulty },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchService.joinMatchmaking(
      request.user.userId,
      body.categoryId,
      body.difficulty,
    );
  }

  @Get('history')
  @UseGuards(AccessTokenGuard)
  history(@Req() request: AuthenticatedRequest) {
    return this.matchService.getHistory(request.user.userId);
  }
}
