import { IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsNotEmpty()
  options: any[];

  @IsString()
  @IsNotEmpty()
  category: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  level: string;
}
