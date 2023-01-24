import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { catchError, map, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signUp')
  async signUp(@Body() body: SignupDto): Promise<{ accessToken: string }> {
    return await this.authService.signUp(body);
  }

  @Post('signIn')
  async signIn(@Body() body: SignInDto): Promise<{ accessToken: string }> {
    return await this.authService.signIn(body);
  }
}
