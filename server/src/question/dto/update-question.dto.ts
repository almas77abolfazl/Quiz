import { IsOptional, IsString } from 'class-validator';
import { ObjectID } from 'typeorm';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  questionText: string;

  @IsOptional()
  options: any[];

  @IsString()
  @IsOptional()
  category: ObjectID;

  @IsString()
  @IsOptional()
  level: string;
}
