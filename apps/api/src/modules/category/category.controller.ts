import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@quiz/contracts';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
