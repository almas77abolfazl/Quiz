import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { catchError, map, tap, switchMap, shareReplay } from 'rxjs/operators';
import { UserRole } from '@quiz/contracts';
import { AdminUser, RequestOtpResponse, VerifyOtpResponse } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'quiz_admin_access_token';
const REFRESH_TOKEN_KEY = 'quiz_admin_refresh_token';

const ALLOWED_STAFF_ROLES: UserRole[] = [
  UserRole.ROOT_ADMIN,
  UserRole.CONTENT_SPECIALIST,
  UserRole.SUPPORT,
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  // Private writable signals
  private readonly _user = signal<AdminUser | null>(null);
  private readonly _accessToken = signal<string | null>(this.getStoredAccessToken());
  private readonly _refreshToken = signal<string | null>(this.getStoredRefreshToken());
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isInitialized = signal<boolean>(false);
  private readonly _authError = signal<string | null>(null);

  private refreshInProgress$: Observable<VerifyOtpResponse> | null = null;

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly authError = this._authError.asReadonly();

  // Computed state
  readonly isAuthenticated = computed(() => !!this._user() && !!this._accessToken());
  readonly userRole = computed(() => this._user()?.role ?? null);
  readonly isStaff = computed(() => {
    const role = this.userRole();
    return role ? ALLOWED_STAFF_ROLES.includes(role) : false;
  });

  requestOtp(phone: string): Observable<RequestOtpResponse> {
    this._isLoading.set(true);
    this._authError.set(null);
    return this.http.post<RequestOtpResponse>('/api/auth/otp', { phone }).pipe(
      tap(() => this._isLoading.set(false)),
      catchError((error: HttpErrorResponse) => {
        this._isLoading.set(false);
        const msg = error.error?.message || 'خطا در ارسال کد تایید';
        this._authError.set(Array.isArray(msg) ? msg.join('، ') : msg);
        return throwError(() => error);
      }),
    );
  }

  verifyOtp(phone: string, code: string): Observable<AdminUser> {
    this._isLoading.set(true);
    this._authError.set(null);

    return this.http.post<VerifyOtpResponse>('/api/auth/verify', { phone, code }).pipe(
      switchMap((session) => {
        this.saveTokens(session.accessToken, session.refreshToken);
        return this.fetchProfile();
      }),
      tap((user) => {
        this._isLoading.set(false);
        if (!ALLOWED_STAFF_ROLES.includes(user.role)) {
          this.clearSession();
          const errorMsg = 'دسترسی غیرمجاز: حساب کاربری شما دارای نقش مدیریتی نیست.';
          this._authError.set(errorMsg);
          throw new Error(errorMsg);
        }
      }),
      catchError((error: HttpErrorResponse | Error) => {
        this._isLoading.set(false);
        if (!(error instanceof Error && error.message.startsWith('دسترسی غیرمجاز'))) {
          const rawMsg = (error as HttpErrorResponse).error?.message;
          let msg = 'کد تایید وارد شده نامعتبر یا منقضی شده است.';
          if (
            rawMsg &&
            rawMsg !== 'OTP is expired or invalid' &&
            rawMsg !== 'Invalid verification request'
          ) {
            msg = Array.isArray(rawMsg) ? rawMsg.join('، ') : rawMsg;
          }
          this._authError.set(msg);
        }
        return throwError(() => error);
      }),
    );
  }

  fetchProfile(): Observable<AdminUser> {
    return this.http.get<AdminUser>('/api/auth/me').pipe(
      tap((user) => {
        this._user.set(user);
      }),
    );
  }

  restoreSession(): Observable<boolean> {
    const token = this.getStoredAccessToken();
    const rToken = this.getStoredRefreshToken();

    if (!token) {
      this.clearSession();
      this._isInitialized.set(true);
      return of(false);
    }

    this._accessToken.set(token);
    this._refreshToken.set(rToken);

    return this.fetchProfile().pipe(
      map((user) => {
        this._isInitialized.set(true);
        if (ALLOWED_STAFF_ROLES.includes(user.role)) {
          return true;
        } else {
          this.clearSession();
          this._authError.set('دسترسی غیرمجاز: حساب کاربری شما دارای نقش مدیریتی نیست.');
          return false;
        }
      }),
      catchError(() => {
        if (rToken) {
          return this.refreshTokenFlow().pipe(
            switchMap(() => this.fetchProfile()),
            map((user) => {
              this._isInitialized.set(true);
              if (ALLOWED_STAFF_ROLES.includes(user.role)) {
                return true;
              } else {
                this.clearSession();
                this._authError.set('دسترسی غیرمجاز: حساب کاربری شما دارای نقش مدیریتی نیست.');
                return false;
              }
            }),
            catchError(() => {
              this.clearSession();
              this._isInitialized.set(true);
              return of(false);
            }),
          );
        } else {
          this.clearSession();
          this._isInitialized.set(true);
          return of(false);
        }
      }),
    );
  }

  refreshTokenFlow(): Observable<VerifyOtpResponse> {
    const rToken = this._refreshToken();
    if (!rToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    this.refreshInProgress$ = this.http
      .post<VerifyOtpResponse>('/api/auth/refresh', { refreshToken: rToken })
      .pipe(
        tap((res) => {
          this.saveTokens(res.accessToken, res.refreshToken);
          this.refreshInProgress$ = null;
        }),
        catchError((err) => {
          this.refreshInProgress$ = null;
          this.clearSession();
          return throwError(() => err);
        }),
        shareReplay(1),
      );

    return this.refreshInProgress$;
  }

  logout(): Observable<void> {
    const rToken = this._refreshToken();
    const logoutReq$ = rToken
      ? this.http
          .post<void>('/api/auth/logout', { refreshToken: rToken })
          .pipe(catchError(() => of(undefined)))
      : of(undefined);

    return logoutReq$.pipe(
      tap(() => {
        this.clearSession();
      }),
    );
  }

  clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
  }

  setAuthError(message: string | null): void {
    this._authError.set(message);
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    this._accessToken.set(accessToken);
    this._refreshToken.set(refreshToken);
  }

  private getStoredAccessToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  }

  private getStoredRefreshToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }
}
