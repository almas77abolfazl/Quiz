import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  public currentUser: Observable<User | null>;
  private currentUserSubject: BehaviorSubject<User | null>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('currentUser') as string)
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string) {
    return this.http
      .post<any>(`/users/authenticate`, { username, password })
      .pipe(
        map((user) => {
          // store user details and basic auth credentials in local storage to keep user logged in between page refreshes
          user.authData = window.btoa(username + ':' + password);
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user[0]);
          return user;
        })
      );
  }

  register(username: string, password: string, email: string) {
    return this.http.post<any>(`/register`, { username, password, email }).pipe(
      map((user) => {
        // store user details and basic auth credentials in local storage to keep user logged in between page refreshes
        user.authData = window.btoa(username + ':' + password);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user[0]);
        return user;
      })
    );
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }
}
