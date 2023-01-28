import { IsOptional, IsString } from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  questionText: string;

  @IsOptional()
  options: any[];

  @IsString()
  @IsOptional()
  category: string;

  @IsString()
  @IsOptional()
  level: string;
}
