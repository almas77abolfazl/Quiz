import { IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';
import { Option } from '../question.schema';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  questionText: string;

  @IsOptional()
  options: Option[];

  @IsString()
  @IsOptional()
  category: Types.ObjectId;

  @IsString()
  @IsOptional()
  level: string;
}
