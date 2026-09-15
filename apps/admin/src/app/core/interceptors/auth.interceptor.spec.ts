import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { authInterceptor, IS_RETRIED_REQUEST } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let routerMock: any;

  beforeEach(() => {
    localStorage.clear();
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should attach Authorization header to protected API requests when authenticated', () => {
    localStorage.setItem('quiz_admin_access_token', 'test-access-token');
    (authService as any)._accessToken.set('test-access-token');

    http.get('/api/categories').subscribe();

    const req = httpMock.expectOne('/api/categories');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    req.flush([]);
  });

  it('should skip attaching Authorization header to OTP and verify endpoints', () => {
    localStorage.setItem('quiz_admin_access_token', 'test-access-token');
    (authService as any)._accessToken.set('test-access-token');

    http.post('/api/auth/otp', { phone: '09120000001' }).subscribe();
    const otpReq = httpMock.expectOne('/api/auth/otp');
    expect(otpReq.request.headers.has('Authorization')).toBe(false);
    otpReq.flush({ expiresInSeconds: 300 });

    http.post('/api/auth/verify', { phone: '09120000001', code: '123456' }).subscribe();
    const verifyReq = httpMock.expectOne('/api/auth/verify');
    expect(verifyReq.request.headers.has('Authorization')).toBe(false);
    verifyReq.flush({ accessToken: 'a', refreshToken: 'r', expiresAt: 'date' });
  });

  it('should attempt refresh on protected 401 response and retry request with HttpContextToken IS_RETRIED_REQUEST', () => {
    localStorage.setItem('quiz_admin_access_token', 'old-access-token');
    localStorage.setItem('quiz_admin_refresh_token', 'valid-refresh-token');
    (authService as any)._accessToken.set('old-access-token');
    (authService as any)._refreshToken.set('valid-refresh-token');

    http.get('/api/categories').subscribe();

    const firstReq = httpMock.expectOne('/api/categories');
    expect(firstReq.request.context.get(IS_RETRIED_REQUEST)).toBe(false);
    firstReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    expect(refreshReq.request.body).toEqual({ refreshToken: 'valid-refresh-token' });
    expect(refreshReq.request.headers.has('Authorization')).toBe(false);
    refreshReq.flush({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date().toISOString(),
    });

    const retriedReq = httpMock.expectOne('/api/categories');
    expect(retriedReq.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    expect(retriedReq.request.headers.has('X-Retried')).toBe(false);
    expect(retriedReq.request.context.get(IS_RETRIED_REQUEST)).toBe(true);
    retriedReq.flush([]);
  });

  it('should not trigger refresh when refresh endpoint itself returns 401', () => {
    localStorage.setItem('quiz_admin_refresh_token', 'invalid-refresh-token');
    (authService as any)._refreshToken.set('invalid-refresh-token');

    authService
      .refreshTokenFlow()
      .pipe(catchError((err) => of(null)))
      .subscribe();

    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    refreshReq.flush(
      { message: 'Session is no longer valid' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Expect no second refresh call
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('should not trigger refresh when logout endpoint returns 401', () => {
    localStorage.setItem('quiz_admin_refresh_token', 'r-token');
    (authService as any)._refreshToken.set('r-token');

    authService.logout().subscribe();

    const logoutReq = httpMock.expectOne('/api/auth/logout');
    logoutReq.flush({ message: 'Invalid session' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.isAuthenticated()).toBe(false);
  });

  it('should retry protected request at most once and fail on second 401 without X-Retried header', () => {
    localStorage.setItem('quiz_admin_access_token', 'old-access-token');
    localStorage.setItem('quiz_admin_refresh_token', 'valid-refresh-token');
    (authService as any)._accessToken.set('old-access-token');
    (authService as any)._refreshToken.set('valid-refresh-token');

    http
      .get('/api/categories')
      .pipe(catchError((err) => of(null)))
      .subscribe();

    // Initial 401
    const firstReq = httpMock.expectOne('/api/categories');
    expect(firstReq.request.headers.has('X-Retried')).toBe(false);
    firstReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Refresh succeeds
    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    refreshReq.flush({ accessToken: 'new-token', refreshToken: 'new-rtoken', expiresAt: 'date' });

    // Retried request fails with 401 again
    const retriedReq = httpMock.expectOne('/api/categories');
    expect(retriedReq.request.headers.has('X-Retried')).toBe(false);
    expect(retriedReq.request.context.get(IS_RETRIED_REQUEST)).toBe(true);
    retriedReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Should redirect to login without triggering second refresh
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('should share single in-flight refresh request for concurrent 401 responses', () => {
    localStorage.setItem('quiz_admin_access_token', 'old-access-token');
    localStorage.setItem('quiz_admin_refresh_token', 'valid-refresh-token');
    (authService as any)._accessToken.set('old-access-token');
    (authService as any)._refreshToken.set('valid-refresh-token');

    // Launch two simultaneous requests
    http.get('/api/categories').subscribe();
    http.get('/api/auth/me').subscribe();

    const req1 = httpMock.expectOne('/api/categories');
    const req2 = httpMock.expectOne('/api/auth/me');

    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    req2.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Expect only ONE refresh call
    const refreshReqs = httpMock.match('/api/auth/refresh');
    expect(refreshReqs.length).toBe(1);

    refreshReqs[0].flush({
      accessToken: 'shared-token',
      refreshToken: 'shared-rtoken',
      expiresAt: 'date',
    });

    const retried1 = httpMock.expectOne('/api/categories');
    const retried2 = httpMock.expectOne('/api/auth/me');

    expect(retried1.request.headers.get('Authorization')).toBe('Bearer shared-token');
    expect(retried2.request.headers.get('Authorization')).toBe('Bearer shared-token');
    expect(retried1.request.headers.has('X-Retried')).toBe(false);
    expect(retried2.request.headers.has('X-Retried')).toBe(false);
    expect(retried1.request.context.get(IS_RETRIED_REQUEST)).toBe(true);
    expect(retried2.request.context.get(IS_RETRIED_REQUEST)).toBe(true);

    retried1.flush([]);
    retried2.flush({ id: 'u1', role: 'ROOT_ADMIN' });
  });
});
