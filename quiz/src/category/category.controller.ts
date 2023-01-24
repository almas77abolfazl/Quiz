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
import { CategoryService } from './category.service';

@Controller('auth')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}
}
