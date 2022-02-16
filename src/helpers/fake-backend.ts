import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpResponse,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { User } from '../models/models';
import {
  delay,
  dematerialize,
  map,
  materialize,
  mergeMap,
} from 'rxjs/operators';

const users: User[] = [
  {
    userId: 1,
    username: 'admin',
    password: '123',
    firstName: 'admin',
    lastName: '123',
    email: '',
  },
];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  constructor(private http: HttpClient) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const { url, method, headers, body } = request;

    return of(null)
      .pipe(mergeMap(handleRoute))
      .pipe(materialize()) // call materialize and dematerialize to ensure delay even if an error is thrown (https://github.com/Reactive-Extensions/RxJS/issues/648)
      .pipe(delay(500))
      .pipe(dematerialize());

    function handleRoute() {
      switch (true) {
        case url.endsWith('/users/authenticate') && method === 'POST':
          return authenticate();
        case url.endsWith('/users') && method === 'GET':
          return getUsers();
        case url.endsWith('/register') && method === 'POST':
          return register();
        default:
          // pass through any requests not handled above
          return next.handle(request);
      }

      // route functions

      function authenticate() {
        const { username, password } = body;
        const user = users.find(
          (x) => x.username === username && x.password === password
        );
        if (!user) return error('Username or password is incorrect');
        return ok([
          {
            userId: user.userId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        ]);
      }
      function register(): Observable<HttpEvent<any>> {
        const { username, password, email } = body;

        const user = users.find(
          (x: any) => x.username === username || x.email === email
        );
        if (user) {
          return error('ایمیل یا نام کاربری تکراری می باشد');
        } else {
          const newUser = {
            userId: users.length + 1,
            username: username,
            password: password,
            email: email,
            firstName: '',
            lastName: '',
          };
          users.push(newUser);
          return ok([newUser]);
        }
      }

      function getUsers() {
        if (!isLoggedIn()) return unauthorized();
        return ok(users);
      }

      // helper functions

      function ok(body?: User[]) {
        return of(new HttpResponse({ status: 200, body }));
      }

      function error(message: string) {
        return throwError({ error: { message } });
      }

      function unauthorized() {
        return throwError({ status: 401, error: { message: 'Unauthorised' } });
      }

      function isLoggedIn() {
        return (
          headers.get('Authorization') === `Basic ${window.btoa('test:test')}`
        );
      }

      // authenticate(request: HttpRequest<any>): Observable<HttpEvent<any>> {
      //   return new Observable((subscriber) => {
      //     const { body } = request;
      //     const { username, password } = body;
      //     this.http.get('/api/users').subscribe((users: any) => {
      //       const user = users.find(
      //         (x: any) => x.username === username && x.password === password
      //       );
      //       if (!user)
      //         subscriber.next(this.error('Username or password is incorrect'));
      //       else
      //         subscriber.next(
      //           this.ok([
      //             {
      //               userId: user.userId,
      //               username: user.username,
      //               firstName: user.firstName,
      //               lastName: user.lastName,
      //             },
      //           ])
      //         );
      //     });
      //   });
      // }

      // getUsers(request: HttpRequest<any>): Observable<HttpEvent<any>> {
      //   const { headers } = request;
      //   if (!this.isLoggedIn(headers)) return this.unauthorized();
      //   return this.http
      //     .get('/api/users')
      //     .pipe(map((users: any) => this.ok(users)));
      // }

      // register(request: HttpRequest<any>): Observable<HttpEvent<any>> {
      //   return new Observable((subscriber) => {
      //     const { body } = request;
      //     const { username, password, email } = body;
      //     this.http.get('/api/users').subscribe((users: any) => {
      //       const user = users.find(
      //         (x: any) => x.username === username || x.email === email
      //       );
      //       if (user) {
      //         subscriber.next(this.error('ایمیل یا نام کاربری تکراری می باشد'));
      //       } else {
      //         const newUser = {
      //           userId: users.length + 1,
      //           username: username,
      //           password: password,
      //           email: email,
      //           firstName: '',
      //           lastName: '',
      //         };
      //         this.http.put('/api/users', newUser);
      //         subscriber.next(this.ok([newUser]));
      //       }
      //     });
      //   });
      // }

      // ok(body?: User[]) {
      //   return new HttpResponse({ status: 200, body });
      // }

      // error(message: string) {
      //   return new HttpResponse({ body: message, status: 500 });
      // }

      // unauthorized() {
      //   return throwError({ status: 401, error: { message: 'Unauthorised' } });
      // }

      // isLoggedIn(headers: HttpHeaders) {
      //   return headers.get('Authorization') === `Basic ${window.btoa('test:test')}`;
      // }
    }
  }
}

export let fakeBackendProvider = {
  // use fake backend in place of Http service for backend-less development
  provide: HTTP_INTERCEPTORS,
  useClass: FakeBackendInterceptor,
  multi: true,
};
