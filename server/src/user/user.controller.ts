import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.schema';
import { UserService } from './user.service';

@Controller('user')
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
  async getQuestionById(@Param('id') id: string): Promise<User> {
    return await this.service.getById(id);
  }
}
