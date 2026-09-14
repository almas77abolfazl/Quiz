import { IsString, IsOptional, Length, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'Username must contain only English letters, numbers, _ and .' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;
}
