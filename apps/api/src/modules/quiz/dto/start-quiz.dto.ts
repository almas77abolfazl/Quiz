import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Difficulty } from '../../../types/contracts';

export class StartQuizDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
