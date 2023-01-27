import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryRepository)
    public readonly categoryRepository: MongoRepository<CategoryRepository>,
  ) {}

  public async create(
    title: string,
  ): Promise<{ created: boolean; message: string }> {
    const category = await this.getByTitle(title);
    if (!category) {
      const newCategory = new CategoryRepository();
      newCategory.title = title;
      await this.categoryRepository.save([newCategory]);
      return { created: true, message: 'messages.savedSuccessfully' };
    } else {
      throw new UnprocessableEntityException(
        'A category has already been created with this title.',
      );
    }
  }

  public async update(
    id: string,
    title: string,
  ): Promise<{ updated: boolean; message: string }> {
    const category = await this.getById(id);
    if (!category) {
      throw new HttpException(
        'This category does not exist',
        HttpStatus.NOT_FOUND,
      );
    } else {
      category.title = title;
      await this.categoryRepository.save([category]);
      return { updated: true, message: 'messages.savedSuccessfully' };
    }
  }

  public async getAll(): Promise<CategoryRepository[]> {
    return await this.categoryRepository.find({});
  }

  public async getById(id?: string): Promise<CategoryRepository> {
    const category = await this.categoryRepository.findOneById(id);
    return category;
  }

  public async deleteById(id?: string) {
    return await this.categoryRepository.delete(id);
  }

  private async getByTitle(title: string): Promise<CategoryRepository> {
    const category = await this.categoryRepository.findOne({
      where: { title },
    });
    return category;
  }
}
