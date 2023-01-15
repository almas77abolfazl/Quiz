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
  signUp(@Body() body: SignupDto): Observable<any> {
    return this.authService.signUp(body).pipe(
      map((accessToken: string) => {
        return { accessToken };
      }),
      catchError((err) => of(err)),
    );
  }

  @Post('signIn')
  signIn(@Body() body: SignInDto): Observable<string> {
    return this.authService.signIn(body).pipe(
      map((accessToken: string) => {
        return accessToken;
      }),
      catchError((err) => of(err)),
    );
  }
}
