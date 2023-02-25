import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { from, map, Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class UserIsUserGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  canActivate(context: ExecutionContext): Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-access-token'] as string;
    return from(
      this.authService.getUserFromAuthenticationToken(token, false),
    ).pipe(
      map((user) => {
        if (user) return true;
        else throw new UnauthorizedException();
      }),
    );
  }
}
