import { IsEmail, IsString, IsOptional } from 'class-validator';
import { Gender, Roles } from '../user.schema';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  id: string;

  @IsString()
  @IsOptional()
  username: string;

  @IsString()
  @IsOptional()
  password: string;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsString()
  @IsOptional()
  gender: Gender;

  @IsString()
  @IsOptional()
  role: Roles;

  @IsString()
  @IsOptional()
  address: Roles;

  @IsOptional()
  sessions: Roles;
}
