import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { UserRole } from '@quiz/contracts';
import { authGuard, unauthGuard, questionsGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('Route Guards', () => {
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signalMock(false),
      isStaff: signalMock(false),
      isInitialized: signalMock(true),
      userRole: signalMock(null),
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

  function signalMock(initialValue: any) {
    let val = initialValue;
    const fn: any = () => val;
    fn.set = (n: any) => (val = n);
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

  it('questionsGuard should allow access for ROOT_ADMIN', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isStaff.set(true);
    authServiceMock.userRole.set(UserRole.ROOT_ADMIN);

    const result = TestBed.runInInjectionContext(() =>
      questionsGuard({} as any, { url: '/questions' } as any),
    );

    expect(result).toBe(true);
  });

  it('questionsGuard should allow access for CONTENT_SPECIALIST', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isStaff.set(true);
    authServiceMock.userRole.set(UserRole.CONTENT_SPECIALIST);

    const result = TestBed.runInInjectionContext(() =>
      questionsGuard({} as any, { url: '/questions' } as any),
    );

    expect(result).toBe(true);
  });

  it('questionsGuard should reject access for SUPPORT role and redirect to /dashboard', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isStaff.set(true);
    authServiceMock.userRole.set(UserRole.SUPPORT);

    const navigateSpy = vi.spyOn(routerMock, 'navigate');

    const result = TestBed.runInInjectionContext(() =>
      questionsGuard({} as any, { url: '/questions' } as any),
    );

    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
