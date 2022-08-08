import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Question, User } from 'src/models/models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WebRequestService {
  readonly ROOT_URL;

  constructor(private http: HttpClient) {
    this.ROOT_URL = 'http://localhost:5000';
  }

  public get(uri: string): Observable<any> {
    return this.http.get(`${this.ROOT_URL}/${uri}`);
  }

  public post(uri: string, payload: Object): Observable<any> {
    return this.http.post(`${this.ROOT_URL}/${uri}`, payload);
  }

  public patch(uri: string, payload: Object): Observable<any> {
    return this.http.patch(`${this.ROOT_URL}/${uri}`, payload);
  }

  public delete(uri: string): Observable<any> {
    return this.http.delete(`${this.ROOT_URL}/${uri}`);
  }

  public login(useData: Partial<User>): Observable<any> {
    return this.http.post(`${this.ROOT_URL}/users/login`, useData, {
      observe: 'response',
    });
  }

  public signup(useData: Partial<User>): Observable<any> {
    return this.http.post(`${this.ROOT_URL}/users`, useData, {
      observe: 'response',
    });
  }

  public getNewAccessToken(options: any): Observable<any> {
    return this.http.get(`${this.ROOT_URL}/users/me/access-token`, options);
  }

  public getRandomQuestion(options: any): Observable<any> {
    return this.http.get(`${this.ROOT_URL}/questions/random`, options);
  }

  getEntity(entityName: string, id: string): Observable<any> {
    const url = `${entityName}/${id}`;
    return this.get(url).pipe(map((x) => x.data));
  }

  saveEntity(entityName: string, entity: any): Observable<any> {
    return this.http.post(`${this.ROOT_URL}/${entityName}`, entity, {
      observe: 'response',
    });
  }
}
