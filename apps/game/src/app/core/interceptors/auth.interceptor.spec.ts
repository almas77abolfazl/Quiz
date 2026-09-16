import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
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

  it('should attach Authorization header only to protected API requests', () => {
    authService.setTokens('initial_access_token', 'initial_refresh_token');

    http.get('/api/protected').subscribe();

    const req = httpMock.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe('Bearer initial_access_token');
    req.flush({});
  });

  it('should not attach Authorization header to auth endpoints', () => {
    authService.setTokens('initial_access_token', 'initial_refresh_token');

    http.post('/api/auth/otp', { phone: '09123456789' }).subscribe();

    const req = httpMock.expectOne('/api/auth/otp');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should perform a single refresh attempt on 401 response and retry request', () => {
    authService.setTokens('old_access_token', 'valid_refresh_token');

    http.get('/api/protected').subscribe((res: any) => {
      expect(res.data).toBe('success');
    });

    // 1. Initial request fails with 401
    const req1 = httpMock.expectOne('/api/protected');
    expect(req1.request.headers.get('Authorization')).toBe('Bearer old_access_token');
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // 2. Refresh request sent
    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    expect(refreshReq.request.body).toEqual({ refreshToken: 'valid_refresh_token' });
    refreshReq.flush({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
    });

    // 3. Retried request sent with new access token
    const req1Retry = httpMock.expectOne('/api/protected');
    expect(req1Retry.request.headers.get('Authorization')).toBe('Bearer new_access_token');
    req1Retry.flush({ data: 'success' });

    expect(authService.getAccessToken()).toBe('new_access_token');
    expect(authService.getRefreshToken()).toBe('new_refresh_token');
  });

  it('should share single refresh call across concurrent 401 requests', () => {
    authService.setTokens('old_access_token', 'valid_refresh_token');

    let req1Result: any;
    let req2Result: any;

    http.get('/api/protected-1').subscribe((res) => (req1Result = res));
    http.get('/api/protected-2').subscribe((res) => (req2Result = res));

    const req1 = httpMock.expectOne('/api/protected-1');
    const req2 = httpMock.expectOne('/api/protected-2');

    // Both requests return 401
    req1.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    req2.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    // Expect ONLY ONE refresh request to be made!
    const refreshReqs = httpMock.match('/api/auth/refresh');
    expect(refreshReqs.length).toBe(1);
    refreshReqs[0].flush({
      accessToken: 'shared_new_token',
      refreshToken: 'shared_new_refresh_token',
    });

    // Both original requests are retried with the shared new token
    const retry1 = httpMock.expectOne('/api/protected-1');
    const retry2 = httpMock.expectOne('/api/protected-2');

    expect(retry1.request.headers.get('Authorization')).toBe('Bearer shared_new_token');
    expect(retry2.request.headers.get('Authorization')).toBe('Bearer shared_new_token');

    retry1.flush({ data: 'resp1' });
    retry2.flush({ data: 'resp2' });

    expect(req1Result).toEqual({ data: 'resp1' });
    expect(req2Result).toEqual({ data: 'resp2' });
  });

  it('should clear session and redirect to login if refresh fails', () => {
    authService.setTokens('old_access_token', 'invalid_refresh_token');

    let errorReceived = false;
    http.get('/api/protected').subscribe({
      error: () => (errorReceived = true),
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    refreshReq.flush({ message: 'Invalid session' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBe(true);
    expect(authService.getAccessToken()).toBeNull();
    expect(authService.getRefreshToken()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
