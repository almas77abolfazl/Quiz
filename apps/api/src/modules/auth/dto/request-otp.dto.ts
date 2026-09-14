import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^(?:0?9\d{9}|\+989\d{9}|00989\d{9})$/, {
    message: 'phone must be a valid Iranian mobile number',
  })
  phone!: string;
}
