import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthenticationService } from 'src/modules/shared/services/authentication/authentication.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DialogService } from 'src/modules/shared/services/dialog/dialog.service';

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
  reqForNewAccessToken!: boolean;

  constructor(
    private authenticationService: AuthenticationService,
    private spinner: NgxSpinnerService,
    private dialogService: DialogService
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
          if (!this.reqForNewAccessToken) {
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
          } else {
            // In this situation, there is no user or user token refresh and it must be logged out
            console.log(error.message);
            this.authenticationService.logout();
            return of(error);
          }
        }
        this.dialogService.showMessage(error.error);

        return of(error);
      })
    );
  }

  refreshAccessToken() {
    // we want to call a method in the auth service to send a request to refresh the access token
    this.reqForNewAccessToken = true;
    return this.authenticationService.getNewAccessToken().pipe(
      tap(() => {
        this.reqForNewAccessToken = false;
        console.log('Access Token Refreshed!');
      })
    );
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
