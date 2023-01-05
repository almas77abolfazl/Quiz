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
      map((token: string) => {
        return { token };
      }),
      catchError((err) => of(err)),
    );
  }

  @Post('signIn')
  signIn(@Body() body: SignInDto): Observable<any> {
    return this.authService.signIn(body).pipe(
      map((token: string) => {
        return { token };
      }),
      catchError((err) => of(err)),
    );
  }
}
