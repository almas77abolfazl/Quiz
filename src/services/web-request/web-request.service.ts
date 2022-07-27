import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Question, User } from 'src/models/models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebRequestService {
  readonly ROOT_URL;

  constructor(private http: HttpClient) {
    this.ROOT_URL = 'http://localhost:5000';
  }

  public get(uri: string) {
    return this.http.get(`${this.ROOT_URL}/${uri}`);
  }

  public post(uri: string, payload: Object) {
    return this.http.post(`${this.ROOT_URL}/${uri}`, payload);
  }

  public patch(uri: string, payload: Object) {
    return this.http.patch(`${this.ROOT_URL}/${uri}`, payload);
  }

  public delete(uri: string) {
    return this.http.delete(`${this.ROOT_URL}/${uri}`);
  }

  public login(username: string, password: string) {
    return this.http.post(
      `${this.ROOT_URL}/users/login`,
      {
        username,
        password,
      },
      {
        observe: 'response',
      }
    );
  }

  public signup(useData: Partial<User>): Observable<any> {
    return this.http.post(`${this.ROOT_URL}/users/create`, useData, {
      observe: 'response',
    });
  }

  public addQuestion(question: Question): Observable<any> {
    return this.http.post(`${this.ROOT_URL}/questions/create`, question, {
      observe: 'response',
    });
  }

  public getNewAccessToken(options: any): Observable<any> {
    return this.http.get(`${this.ROOT_URL}/users/me/access-token`, options);
  }
}
