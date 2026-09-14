import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  coverKey?: string;
}
