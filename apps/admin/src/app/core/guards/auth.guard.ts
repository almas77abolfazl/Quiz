import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkAuth = (): boolean => {
    if (authService.isAuthenticated() && authService.isStaff()) {
      return true;
    }

    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  };

  if (!authService.isInitialized()) {
    return authService.restoreSession().pipe(map(() => checkAuth()));
  }

  return checkAuth();
};

export const unauthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkUnauth = (): boolean => {
    if (authService.isAuthenticated() && authService.isStaff()) {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  };

  if (!authService.isInitialized()) {
    return authService.restoreSession().pipe(map(() => checkUnauth()));
  }

  return checkUnauth();
};

export const questionsGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkAccess = (): boolean => {
    if (!authService.isAuthenticated() || !authService.isStaff()) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    const role = authService.userRole();
    if (role === 'ROOT_ADMIN' || role === 'CONTENT_SPECIALIST') {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };

  if (!authService.isInitialized()) {
    return authService.restoreSession().pipe(map(() => checkAccess()));
  }

  return checkAccess();
};
