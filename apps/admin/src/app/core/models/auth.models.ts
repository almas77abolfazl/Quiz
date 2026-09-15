import { UserRole } from '@quiz/contracts';

export interface AdminUser {
  id: string;
  phone: string;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  role: UserRole;
  coins: number;
  dailyStreak: number;
}

export interface RequestOtpResponse {
  expiresInSeconds: number;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
