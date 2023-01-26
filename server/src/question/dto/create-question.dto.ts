import { IsNotEmpty, IsString } from 'class-validator';
import { ObjectID } from 'typeorm';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsNotEmpty()
  options: any[];

  @IsString()
  @IsNotEmpty()
  category: ObjectID;

  @IsString()
  @IsNotEmpty()
  level: string;
}
