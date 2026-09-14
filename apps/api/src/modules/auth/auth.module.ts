import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpDeliveryService } from './otp-delivery.service';

@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [AuthService, OtpDeliveryService, AccessTokenGuard],
  exports: [AccessTokenGuard],
})
export class AuthModule {}
