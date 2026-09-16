import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';

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
  private readonly storageKeyAccess = 'quiz_access_token';
  private readonly storageKeyRefresh = 'quiz_refresh_token';

  private isRefreshing = false;
  private readonly refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  requestOtp(phone: string): Observable<{ expiresInSeconds: number }> {
    return this.http.post<{ expiresInSeconds: number }>('/api/auth/otp', { phone });
  }

  verifyOtp(phone: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/verify', { phone, code }).pipe(
      tap((res) => {
        this.setTokens(res.accessToken, res.refreshToken);
      }),
    );
  }

  refreshToken(token?: string): Observable<AuthResponse> {
    const rToken = token || this.getRefreshToken();
    if (!rToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken: rToken }).pipe(
      tap((res) => {
        this.setTokens(res.accessToken, res.refreshToken);
      }),
    );
  }

  logout(token?: string): Observable<void> {
    const rToken = token || this.getRefreshToken();
    this.clearTokens();
    if (rToken) {
      return this.http.post<void>('/api/auth/logout', { refreshToken: rToken });
    }
    return of(undefined);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>('/api/auth/me');
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.storageKeyAccess);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.storageKeyRefresh);
  }

  setAccessToken(token: string | null): void {
    if (token) localStorage.setItem(this.storageKeyAccess, token);
    else localStorage.removeItem(this.storageKeyAccess);
  }

  setRefreshToken(token: string | null): void {
    if (token) localStorage.setItem(this.storageKeyRefresh, token);
    else localStorage.removeItem(this.storageKeyRefresh);
  }

  setTokens(accessToken: string | null, refreshToken: string | null): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(this.storageKeyAccess);
    localStorage.removeItem(this.storageKeyRefresh);
  }

  handle401Error(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.refreshToken().pipe(
        switchMap((res) => {
          this.isRefreshing = false;
          this.refreshSubject.next(res.accessToken);
          const retriedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${res.accessToken}` },
          });
          return next(retriedReq);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.refreshSubject.next('FAILED');
          this.clearTokens();
          this.router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    } else {
      return this.refreshSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          if (!token || token === 'FAILED') {
            this.clearTokens();
            this.router.navigate(['/login']);
            return throwError(() => new Error('Refresh failed'));
          }
          const retriedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
          });
          return next(retriedReq);
        }),
      );
    }
  }
}
