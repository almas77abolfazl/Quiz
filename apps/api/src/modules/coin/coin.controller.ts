import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CoinService } from './coin.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthenticatedRequest } from '../auth/access-token.guard';

@Controller('coins')
export class CoinController {
  constructor(private readonly coinService: CoinService) {}

  @Get('history')
  @UseGuards(AccessTokenGuard)
  history(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.coinService.getTransactionHistory(
      request.user.userId,
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }
}
