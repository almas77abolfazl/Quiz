import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { authGuard, unauthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('Route Guards', () => {
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signalMock(false),
      isStaff: signalMock(false),
      isInitialized: signalMock(true),
      restoreSession: () => of(false),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  function signalMock(initialValue: boolean) {
    let val = initialValue;
    const fn: any = () => val;
    fn.set = (n: boolean) => (val = n);
    return fn;
  }

  it('authGuard should allow access for authenticated staff', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isStaff.set(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any),
    );

    expect(result).toBe(true);
  });

  it('authGuard should redirect unauthenticated user to /login with returnUrl', () => {
    authServiceMock.isAuthenticated.set(false);
    authServiceMock.isStaff.set(false);

    const navigateSpy = vi.spyOn(routerMock, 'navigate');

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/categories' } as any),
    );

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/categories' },
    });
  });

  it('unauthGuard should redirect authenticated staff to /dashboard', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isStaff.set(true);

    const navigateSpy = vi.spyOn(routerMock, 'navigate');

    const result = TestBed.runInInjectionContext(() => unauthGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
