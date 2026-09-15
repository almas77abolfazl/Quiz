import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpContextToken,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const IS_RETRIED_REQUEST = new HttpContextToken<boolean>(() => false);

const EXCLUDED_AUTH_ENDPOINTS = [
  '/api/auth/otp',
  '/api/auth/verify',
  '/api/auth/refresh',
  '/api/auth/logout',
];

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const url = req.url;
  const isApiRequest = url.startsWith('/api/') || url === '/api';
  const isExcluded = EXCLUDED_AUTH_ENDPOINTS.some((ep) => url.includes(ep));
  const isRetried = req.context.get(IS_RETRIED_REQUEST);

  let authReq = req;
  const token = authService.accessToken();

  if (isApiRequest && !isExcluded && token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiRequest) {
        // If the request is an un-refreshable auth endpoint (otp, verify, refresh, logout) OR is already retried once
        if (isExcluded || isRetried) {
          authService.clearSession();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        // Protected request 401: attempt single refresh
        return authService.refreshTokenFlow().pipe(
          switchMap((newSession) => {
            const retriedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newSession.accessToken}`,
              },
              context: req.context.set(IS_RETRIED_REQUEST, true),
            });
            return next(retriedReq);
          }),
          catchError((refreshErr) => {
            authService.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
