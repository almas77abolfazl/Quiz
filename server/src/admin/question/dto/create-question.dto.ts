import { IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';
import { Option } from '../question.schema';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsNotEmpty()
  options: Option[];

  @IsString()
  @IsNotEmpty()
  category: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  level: string;
}
