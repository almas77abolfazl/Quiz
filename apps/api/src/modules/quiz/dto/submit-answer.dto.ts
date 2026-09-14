import { IsString, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string;
}
