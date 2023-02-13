import { Controller, Post, Body, Get, Headers } from '@nestjs/common';
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

  @Get('validateToken')
  async validateToken(
    @Headers('x-access-token') accessToken: string,
  ): Promise<boolean> {
    const user = await this.authService.getUserFromAuthenticationToken(
      accessToken,
    );
    return !!user;
  }

  @Get('access-token')
  async accessToken(
    @Headers('x-access-token') accessToken: string,
  ): Promise<string> {
    return await this.authService.getNewAccessToken(accessToken);
  }
}
