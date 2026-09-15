import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UserRole } from '@quiz/contracts';
import { AdminUser } from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockStaffUser: AdminUser = {
    id: 'user-root-1',
    phone: '09120000001',
    username: 'dev.root',
    displayName: 'Root Administrator',
    avatarKey: null,
    role: UserRole.ROOT_ADMIN,
    coins: 100,
    dailyStreak: 5,
  };

  const mockPlayerUser: AdminUser = {
    id: 'user-player-1',
    phone: '09129999999',
    username: 'player.one',
    displayName: 'Regular Player',
    avatarKey: null,
    role: UserRole.PLAYER,
    coins: 0,
    dailyStreak: 0,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should request OTP successfully', () => {
    service.requestOtp('09120000001').subscribe((res) => {
      expect(res.expiresInSeconds).toBe(300);
    });

    const req = httpMock.expectOne('/api/auth/otp');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ phone: '09120000001' });
    req.flush({ expiresInSeconds: 300 });
  });

  it('should verify OTP successfully for staff role and store session', () => {
    service.verifyOtp('09120000001', '123456').subscribe((user) => {
      expect(user.role).toBe(UserRole.ROOT_ADMIN);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isStaff()).toBe(true);
      expect(service.accessToken()).toBe('mock-access-token');
    });

    const verifyReq = httpMock.expectOne('/api/auth/verify');
    expect(verifyReq.request.method).toBe('POST');
    verifyReq.flush({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date().toISOString(),
    });

    const meReq = httpMock.expectOne('/api/auth/me');
    expect(meReq.request.method).toBe('GET');
    meReq.flush(mockStaffUser);
  });

  it('should handle invalid OTP error behavior', () => {
    let errorHandled = false;
    service
      .verifyOtp('09120000001', '000000')
      .pipe(
        catchError((err) => {
          errorHandled = true;
          expect(err.status).toBe(401);
          expect(service.authError()).toContain('کد تایید وارد شده نامعتبر یا منقضی شده است');
          return of(null);
        }),
      )
      .subscribe();

    const verifyReq = httpMock.expectOne('/api/auth/verify');
    verifyReq.flush(
      { message: 'OTP is expired or invalid' },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(errorHandled).toBe(true);
  });

  it('should reject PLAYER role during OTP verification and clear session', () => {
    let errorHandled = false;
    service
      .verifyOtp('09129999999', '123456')
      .pipe(
        catchError((err) => {
          errorHandled = true;
          expect(err.message).toContain('دسترسی غیرمجاز');
          expect(service.isAuthenticated()).toBe(false);
          return of(null);
        }),
      )
      .subscribe();

    const verifyReq = httpMock.expectOne('/api/auth/verify');
    verifyReq.flush({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date().toISOString(),
    });

    const meReq = httpMock.expectOne('/api/auth/me');
    meReq.flush(mockPlayerUser);
    expect(errorHandled).toBe(true);
  });

  it('should clear session on logout', () => {
    localStorage.setItem('quiz_admin_access_token', 'token-123');
    localStorage.setItem('quiz_admin_refresh_token', 'rtoken-123');
    (service as any)._accessToken.set('token-123');
    (service as any)._refreshToken.set('rtoken-123');

    service.logout().subscribe(() => {
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('quiz_admin_access_token')).toBeNull();
      expect(localStorage.getItem('quiz_admin_refresh_token')).toBeNull();
    });

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should restore session from stored access token', () => {
    localStorage.setItem('quiz_admin_access_token', 'token-123');
    localStorage.setItem('quiz_admin_refresh_token', 'rtoken-123');

    service.restoreSession().subscribe((success) => {
      expect(success).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
    });

    const meReq = httpMock.expectOne('/api/auth/me');
    meReq.flush(mockStaffUser);
  });
});
