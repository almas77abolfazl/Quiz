import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OtpDeliveryService } from './otp-delivery.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otpDelivery: OtpDeliveryService,
  ) {}

  async requestOtp(rawPhone: string): Promise<{ expiresInSeconds: number }> {
    const phone = this.normalizePhone(rawPhone);
    const expiresInSeconds = Number(this.config.get('OTP_EXPIRES_IN_SECONDS', '300'));
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const code = randomInt(100000, 1000000).toString();

    const user = await this.prisma.user.upsert({
      where: { phone },
      create: { phone },
      update: {},
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.otpChallenge.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpChallenge.create({
        data: {
          userId: user.id,
          codeHash: this.hashOtp(phone, code),
          expiresAt,
        },
      }),
    ]);

    await this.otpDelivery.send(phone, code);
    return { expiresInSeconds };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.normalizePhone(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || user.isSuspended) {
      throw new UnauthorizedException('Invalid verification request');
    }

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !challenge ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= MAX_OTP_ATTEMPTS
    ) {
      throw new UnauthorizedException('OTP is expired or invalid');
    }

    if (challenge.codeHash !== this.hashOtp(phone, dto.code)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('OTP is expired or invalid');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    return this.createSession(user.id, user.role);
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.isSuspended
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.createSession(session.userId, session.user.role);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { refreshTokenHash: this.hashToken(rawRefreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        username: true,
        displayName: true,
        avatarKey: true,
        role: true,
        coins: true,
        dailyStreak: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async createSession(userId: string, role: string) {
    const sessionDays = Number(this.config.get('SESSION_EXPIRES_IN_DAYS', '30'));
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    await this.prisma.authSession.create({
      data: { userId, refreshTokenHash: this.hashToken(refreshToken), expiresAt },
    });

    return { accessToken, refreshToken, expiresAt };
  }

  private normalizePhone(rawPhone: string): string {
    const digits = rawPhone.replace(/\s|-/g, '');
    if (digits.startsWith('+98')) return `0${digits.slice(3)}`;
    if (digits.startsWith('0098')) return `0${digits.slice(4)}`;
    if (digits.startsWith('9')) return `0${digits}`;
    if (!/^09\d{9}$/.test(digits)) throw new BadRequestException('Invalid Iranian mobile number');
    return digits;
  }

  private hashOtp(phone: string, code: string): string {
    return this.hash(`${phone}:${code}:${this.config.getOrThrow<string>('OTP_PEPPER')}`);
  }

  private hashToken(token: string): string {
    return this.hash(token);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
