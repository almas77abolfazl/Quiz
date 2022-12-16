import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';

import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from 'src/models/models';
import { WebRequestService } from '../web-request/web-request.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  public currentUserSubject: BehaviorSubject<{ user: User } | null>;

  public get currentUserValue(): { user: User } | null {
    return this.currentUserSubject.value;
  }

  constructor(
    private webRequestService: WebRequestService,
    private router: Router,
    private spinner: NgxSpinnerService
  ) {
    this.currentUserSubject = new BehaviorSubject<{ user: User } | null>(
      JSON.parse(localStorage.getItem('currentUser') as string)
    );
  }

  public login(userData: Partial<User>): Observable<User> {
    this.spinner.show();
    return this.webRequestService.login(userData).pipe(
      map((result: any) => {
        this.spinner.hide();
        const user = result.body;
        this.setSession(user.user._id, user.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user.user;
      })
    );
  }

  public register(userData: Partial<User>): Observable<User> {
    this.spinner.show();
    return this.webRequestService.signup(userData).pipe(
      map((result: any) => {
        this.spinner.hide();
        const user = result.body;
        this.setSession(user.user._id, user.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user.user;
      })
    );
  }

  public logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.removeSession();

    this.router.navigate(['/login']);
  }

  public validateToken(): Observable<boolean> {
    return this.webRequestService.get('users/validateToken').pipe(
      map((res) => {
        if (res.isValid) return true;
        else return false;
      })
    );
  }

  public getAccessToken(): string {
    return localStorage.getItem('x-access-token') || '';
  }

  public getUserId(): string {
    return localStorage.getItem('user-id') || '';
  }

  public getNewAccessToken(): Observable<HttpResponse<any>> {
    const options = {
      headers: {
        _id: this.getUserId(),
      },
      observe: 'response',
    };
    return this.webRequestService.getNewAccessToken(options).pipe(
      tap((res: HttpResponse<any>) => {
        this.setAccessToken(res.body.accessToken || '');
      })
    );
  }

  private setSession(id: string, accessToken: string): void {
    localStorage.setItem('user-id', id);
    localStorage.setItem('x-access-token', accessToken);
  }

  private removeSession(): void {
    localStorage.removeItem('user-id');
    localStorage.removeItem('x-access-token');
  }

  private setAccessToken(accessToken: string): void {
    localStorage.setItem('x-access-token', accessToken);
  }
}
