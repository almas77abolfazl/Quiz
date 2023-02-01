import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private readonly model: Model<CategoryDocument>,
  ) {}

  public async create(
    title: string,
  ): Promise<{ created: boolean; message: string }> {
    const category = await this.getByTitle(title);
    if (!category) {
      const newCategory = {} as Category;
      newCategory.title = title;
      await new this.model({
        ...newCategory,
        createdAt: new Date(),
      }).save();
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
      await this.model.findByIdAndUpdate(id, category).exec();
      return { updated: true, message: 'messages.savedSuccessfully' };
    }
  }

  public async getAll(): Promise<Category[]> {
    return await this.model.find().exec();
  }

  public async getById(id?: string): Promise<Category> {
    return await this.model.findById(id).exec();
  }

  public async deleteById(id?: string): Promise<Category> {
    return await this.model.findByIdAndDelete(id).exec();
  }

  private async getByTitle(title: string): Promise<Category> {
    return await this.model.findOne({ title });
  }
}
