import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should request OTP from existing API', () => {
    service.requestOtp('09123456789').subscribe((res) => {
      expect(res.expiresInSeconds).toBe(300);
    });

    const req = httpMock.expectOne('/api/auth/otp');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ phone: '09123456789' });
    req.flush({ expiresInSeconds: 300 });
  });

  it('should verify OTP and persist access and refresh tokens', () => {
    service.verifyOtp('09123456789', '123456').subscribe((res) => {
      expect(res.accessToken).toBe('access_123');
      expect(res.refreshToken).toBe('refresh_456');
    });

    const req = httpMock.expectOne('/api/auth/verify');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ phone: '09123456789', code: '123456' });
    req.flush({
      accessToken: 'access_123',
      refreshToken: 'refresh_456',
      expiresAt: '2026-10-01T00:00:00.000Z',
    });

    expect(service.getAccessToken()).toBe('access_123');
    expect(service.getRefreshToken()).toBe('refresh_456');
  });

  it('should clear tokens on logout', () => {
    service.setTokens('access_123', 'refresh_456');
    expect(service.getAccessToken()).toBe('access_123');
    expect(service.getRefreshToken()).toBe('refresh_456');

    service.logout('refresh_456').subscribe();

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh_456' });
    req.flush({});

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });
});
