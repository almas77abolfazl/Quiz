import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SeasonService } from './season.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@quiz/contracts';
import { AuthenticatedRequest } from '../auth/access-token.guard';

@Controller('seasons')
export class SeasonController {
  constructor(private readonly seasonService: SeasonService) {}

  @Get()
  findAll() {
    return this.seasonService.findAll();
  }

  @Get('active')
  findActive() {
    return this.seasonService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.seasonService.getRanking(id);
  }

  @Get('entries/:seasonEntryId/me')
  @UseGuards(AccessTokenGuard)
  getMyEntry(
    @Param('seasonEntryId') seasonEntryId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.seasonService.getMyEntry(seasonEntryId, request.user.userId);
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN)
  create(@Body() dto: CreateSeasonDto) {
    return this.seasonService.create(dto);
  }

  @Put(':id/activate')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN)
  activate(@Param('id') id: string) {
    return this.seasonService.activate(id);
  }

  @Post('entries/:seasonEntryId/claim')
  @UseGuards(AccessTokenGuard)
  claimPrize(
    @Param('seasonEntryId') seasonEntryId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.seasonService.claimPrize(seasonEntryId);
  }
}
