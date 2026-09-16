import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);

  const isApiRequest = req.url.startsWith('/api/') || req.url.includes('/api/');
  const isAuthEndpoint =
    req.url.includes('/api/auth/otp') ||
    req.url.includes('/api/auth/verify') ||
    req.url.includes('/api/auth/refresh') ||
    req.url.includes('/api/auth/logout');

  if (!isApiRequest || isAuthEndpoint) {
    return next(req);
  }

  const token = authService.getAccessToken();
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return authService.handle401Error(authReq, next);
      }
      return throwError(() => error);
    }),
  );
};
