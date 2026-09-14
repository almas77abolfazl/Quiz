import { IsString, Length, Matches } from 'class-validator';
import { RequestOtpDto } from './request-otp.dto';

export class VerifyOtpDto extends RequestOtpDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
