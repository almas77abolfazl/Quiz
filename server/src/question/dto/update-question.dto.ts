import { IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  questionText: string;

  @IsOptional()
  options: any[];

  @IsString()
  @IsOptional()
  category: Types.ObjectId;

  @IsString()
  @IsOptional()
  level: string;
}
