import { IsString, IsNotEmpty } from 'class-validator';

export class NextQuestionDto {
  @IsString()
  @IsNotEmpty()
  quizId: string;

  @IsString()
  @IsNotEmpty()
  lastQuestionId: string;

  @IsString()
  @IsNotEmpty()
  lastAnswer: string;
}
