import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserIsUserGuard } from '../auth/user-is-user.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.schema';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(UserIsUserGuard)
export class UserController {
  constructor(private service: UserService) {}

  @Get()
  async getUser(): Promise<User[]> {
    return await this.service.getAll();
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<Partial<User>> {
    return await this.service.updateUser(id, body);
  }

  @Get(':id')
  async getUserId(@Param('id') id: string): Promise<Partial<User>> {
    const { password, ...user } = await this.service.getById(id);
    return user;
  }
}
