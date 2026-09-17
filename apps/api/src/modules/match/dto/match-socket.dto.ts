import { IsOptional, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Difficulty } from '@quiz/contracts';

export class JoinMatchmakingSocketDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}

export class PlayerReadySocketDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;
}

export class SubmitAnswerSocketDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsString()
  @IsNotEmpty()
  matchQuestionId!: string;

  @IsOptional()
  @IsString()
  selectedOptionId?: string;
}

export class ReconnectMatchSocketDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;
}

export class LeaveMatchSocketDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;
}

export class LeaveMatchmakingSocketDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
