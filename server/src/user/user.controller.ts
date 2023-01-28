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
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private service: UserService) {}

  @Get()
  async getUser(): Promise<UserRepository[]> {
    return await this.service.getAll();
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<Partial<UserRepository>> {
    return await this.service.updateUser(id, body);
  }

  @Get(':id')
  async getQuestionById(@Param('id') id: string): Promise<UserRepository> {
    return await this.service.getById(id);
  }
}
