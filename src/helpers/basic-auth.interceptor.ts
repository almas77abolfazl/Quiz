import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthenticationService } from 'src/modules/shared/services/authentication/authentication.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
  refreshingAccessToken!: boolean;

  accessTokenRefreshed: Subject<any> = new Subject();

  constructor(
    private authenticationService: AuthenticationService,
    private spinner: NgxSpinnerService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Handle the request
    request = this.addAuthHeader(request);

    // call next() and handle the response
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        this.spinner.hide();

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
              return of(err);
            })
          );
        }

        alert(error.error);
        return of(error);
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
