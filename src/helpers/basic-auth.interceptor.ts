import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { empty, Observable, Subject, throwError } from 'rxjs';
import { AuthenticationService } from 'src/services/authentication/authentication.service';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
  refreshingAccessToken!: boolean;

  accessTokenRefreshed: Subject<any> = new Subject();

  constructor(private authenticationService: AuthenticationService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Handle the request
    request = this.addAuthHeader(request);

    // call next() and handle the response
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log(error);

        if (error.status === 401) {
          // 401 error so we are unauthorized

          // refresh the access token
          return this.refreshAccessToken().pipe(
            switchMap(() => {
              request = this.addAuthHeader(request);
              return next.handle(request);
            }),
            catchError((err: any) => {
              console.log(err);
              this.authenticationService.logout();
              return empty();
            })
          );
        }

        return throwError(error);
      })
    );
  }

  refreshAccessToken() {
    if (this.refreshingAccessToken) {
      return new Observable((observer) => {
        this.accessTokenRefreshed.subscribe(() => {
          // this code will run when the access token has been refreshed
          observer.next();
          observer.complete();
        });
      });
    } else {
      this.refreshingAccessToken = true;
      // we want to call a method in the auth service to send a request to refresh the access token
      return this.authenticationService.getNewAccessToken().pipe(
        tap(() => {
          console.log('Access Token Refreshed!');
          this.refreshingAccessToken = false;
          this.accessTokenRefreshed.next();
        })
      );
    }
  }

  addAuthHeader(request: HttpRequest<any>) {
    // get the access token
    const token = this.authenticationService.getAccessToken();

    if (token) {
      // append the access token to the request header
      return request.clone({
        setHeaders: {
          'x-access-token': token,
        },
      });
    }
    return request;
  }
}
