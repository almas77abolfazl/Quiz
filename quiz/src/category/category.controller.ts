import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { catchError, map, Observable, of } from 'rxjs';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Post()
  async createCategory(
    @Body() body: CreateCategoryDto,
  ): Promise<{ updated?: boolean; created?: boolean; message: string }> {
    return await this.categoryService.create(body.title);
  }

  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, body.title);
  }

  @Get()
  async getAllCategories(): Promise<CategoryRepository[]> {
    return await this.categoryService.getAll();
  }

  @Get(':id')
  async getCategoryById(@Param('id') id: string): Promise<CategoryRepository> {
    return await this.categoryService.getById(id);
  }

  @Delete(':id')
  async deleteCategoryById(@Param('id') id: string) {
    return await this.categoryService.deleteById(id);
  }
}
