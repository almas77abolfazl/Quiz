import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../../models/models';
import { WebRequestService } from '../web-request/web-request.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  public currentUser: Observable<User | null>;
  private currentUserSubject: BehaviorSubject<User | null>;

  constructor(
    private webRequestService: WebRequestService,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('currentUser') as string)
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string) {
    return this.webRequestService.login(username, password).pipe(
      map((result: any) => {
        const user = result.body;
        this.setSession(user.user._id, user.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user.user;
      })
    );
  }

  register(userData: Partial<User>) {
    return this.webRequestService.signup(userData).pipe(
      map((result: any) => {
        const user = result.body;
        this.setSession(user.user._id, user.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user.user;
      })
    );
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.removeSession();

    this.router.navigate(['/login']);
  }

  getAccessToken() {
    return localStorage.getItem('x-access-token');
  }

  getUserId() {
    return localStorage.getItem('user-id');
  }

  setAccessToken(accessToken: string) {
    localStorage.setItem('x-access-token', accessToken);
  }

  getNewAccessToken() {
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

  private setSession(id: string, accessToken: string) {
    localStorage.setItem('user-id', id);
    localStorage.setItem('x-access-token', accessToken);
  }

  private removeSession() {
    localStorage.removeItem('user-id');
    localStorage.removeItem('x-access-token');
  }
}
