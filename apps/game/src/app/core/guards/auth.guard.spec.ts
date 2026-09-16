import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('Auth Guards', () => {
  let authServiceSpy: { getAccessToken: ReturnType<typeof vi.fn> };
  let routerSpy: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceSpy = { getAccessToken: vi.fn() };
    routerSpy = {
      createUrlTree: vi.fn((commands) => ({ path: commands.join('/') }) as unknown as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  describe('authGuard', () => {
    it('should allow access when access token exists', () => {
      authServiceSpy.getAccessToken.mockReturnValue('valid_token');
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to /login when access token is missing', () => {
      authServiceSpy.getAccessToken.mockReturnValue(null);
      TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('guestGuard', () => {
    it('should allow access when access token is missing', () => {
      authServiceSpy.getAccessToken.mockReturnValue(null);
      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to / when access token exists', () => {
      authServiceSpy.getAccessToken.mockReturnValue('valid_token');
      TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/']);
    });
  });
});
