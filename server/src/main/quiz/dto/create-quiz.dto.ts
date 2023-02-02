import { IsString, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';
import { Levels } from 'src/admin/question/question.schema';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  category: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  level: Levels;
}
