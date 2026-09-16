import { Controller, Get, Patch, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthenticatedRequest } from '../auth/access-token.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me/home-summary')
  @UseGuards(AccessTokenGuard)
  getHomeSummary(@Req() request: AuthenticatedRequest) {
    return this.userService.getHomeSummary(request.user.userId);
  }

  @Get('me/profile')
  @UseGuards(AccessTokenGuard)
  getProfileDetails(@Req() request: AuthenticatedRequest) {
    return this.userService.getProfileDetails(request.user.userId);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.userService.getProfile(request.user.userId);
  }

  @Patch('me')
  @UseGuards(AccessTokenGuard)
  updateMe(@Body() dto: UpdateProfileDto, @Req() request: AuthenticatedRequest) {
    return this.userService.updateProfile(request.user.userId, dto);
  }

  @Post('me/categories/:categoryId/follow')
  @UseGuards(AccessTokenGuard)
  followCategory(@Param('categoryId') categoryId: string, @Req() request: AuthenticatedRequest) {
    return this.userService.followCategory(request.user.userId, categoryId);
  }

  @Delete('me/categories/:categoryId/follow')
  @UseGuards(AccessTokenGuard)
  unfollowCategory(@Param('categoryId') categoryId: string, @Req() request: AuthenticatedRequest) {
    return this.userService.unfollowCategory(request.user.userId, categoryId);
  }

  @Get('me/categories/following')
  @UseGuards(AccessTokenGuard)
  getFollowedCategories(@Req() request: AuthenticatedRequest) {
    return this.userService.getFollowedCategories(request.user.userId);
  }
}
