import { IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateSeasonDto {
  @IsInt()
  jalaliYear!: number;

  @IsInt()
  jalaliMonth!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
