import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface User {
  id: string;
  phone: string;
  username?: string;
  displayName?: string;
  avatarKey?: string;
  role: string;
  coins: number;
  dailyStreak: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'quiz_access_token';

  constructor(private readonly http: HttpClient) {}

  requestOtp(phone: string): Observable<{ expiresInSeconds: number }> {
    return this.http.post<{ expiresInSeconds: number }>('/api/auth/otp', { phone });
  }

  verifyOtp(phone: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/verify', { phone, code });
  }

  refreshToken(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken: token });
  }

  logout(token: string): Observable<void> {
    return this.http.post<void>('/api/auth/logout', { refreshToken: token });
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>('/api/auth/me');
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  setAccessToken(token: string | null) {
    if (token) localStorage.setItem(this.storageKey, token);
    else localStorage.removeItem(this.storageKey);
  }
}
