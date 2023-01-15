import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { forkJoin, from, map, mergeMap, Observable, switchMap } from 'rxjs';
import { UserRepository } from 'src/user/user.repository';
import { MongoRepository } from 'typeorm';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignInDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserRepository)
    public readonly userRepository: MongoRepository<UserRepository>,
    private readonly jwtService: JwtService,
  ) {}

  public signUp(body: SignupDto): Observable<string> {
    return from(this.doesUserExist(body.email, body.username)).pipe(
      switchMap((doesUserExist) => {
        if (doesUserExist)
          throw new HttpException(
            'A user has already been created with this email or username address',
            HttpStatus.FORBIDDEN,
          );
        return this.hashPassword(body.password).pipe(
          switchMap((passwordHash: string) => {
            const newUser = new UserRepository();
            newUser.username = body.username;
            newUser.email = body.email;
            newUser.password = passwordHash;
            const observables = {
              refreshToken: this.createSession(newUser),
              user: from(this.userRepository.save(newUser)),
            };
            return forkJoin(observables).pipe(
              switchMap((res) => {
                if (res.user) {
                  const { password, ...result } = res.user;
                  return this.generateJWT(result);
                }
              }),
            );
          }),
        );
      }),
    );
  }

  public signIn(user: SignInDto): Observable<string> {
    return this.validateUser(user.username, user.password).pipe(
      switchMap((user: Partial<UserRepository>) => {
        if (user) {
          return this.createSession(user).pipe(
            switchMap((_refreshToken) => {
              return this.generateJWT(user);
            }),
          );
        }
      }),
    );
  }

  private doesUserExist(email: string, username: string): Observable<boolean> {
    return from(
      this.userRepository.findOne({
        where: [{ email }, { username }],
      }),
    ).pipe(map((user: UserRepository) => !!user));
  }

  private hashPassword(password: string): Observable<string> {
    return from<string>(bcrypt.genSalt(12)).pipe(
      mergeMap((salt) => {
        return from<string>(bcrypt.hash(password, salt));
      }),
    );
  }

  private generateJWT(user: Partial<UserRepository>): Observable<string> {
    return from(this.jwtService.signAsync(user, { expiresIn: '15m' }));
  }

  private createSession(user: Partial<UserRepository>): Observable<string> {
    return this.generateRefreshAuthToken().pipe(
      switchMap((refreshToken) => {
        return this.saveSessionToDatabase(user, refreshToken);
      }),
    );
  }

  private generateRefreshAuthToken(): Observable<string> {
    return new Observable((subscriber) => {
      crypto.randomBytes(64, (err, buf) => {
        if (!err) {
          const token = buf.toString('hex');
          return subscriber.next(token);
        } else subscriber.error(''); //TODO
      });
    });
  }

  private saveSessionToDatabase(
    user: Partial<UserRepository>,
    refreshToken: string,
  ): Observable<string> {
    // Save session to database
    const expiresAt = this.generateRefreshTokenExpiryTime();
    user.sessions.push({ token: refreshToken, expiresAt });
    return from(this.userRepository.save([user])).pipe(map(() => refreshToken));
  }

  private generateRefreshTokenExpiryTime(): number {
    const daysUntilExpire = 10;
    const secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
    return Date.now() / 1000 + secondsUntilExpire;
  }

  private validateUser(
    username: string,
    password: string,
  ): Observable<Partial<UserRepository>> {
    return from(
      this.userRepository.findOne({
        where: { username },
        select: ['password', 'role', 'sessions'],
      }),
    ).pipe(
      switchMap((user: Partial<UserRepository>) => {
        return this.comparePasswords(password, user.password).pipe(
          map((match: boolean) => {
            if (!match)
              throw new HttpException(
                'Incorrect username or password',
                HttpStatus.FORBIDDEN,
              );
            const { password, ...result } = user;
            return result;
          }),
        );
      }),
    );
  }

  private comparePasswords(
    newPassword: string,
    passwordHash: string,
  ): Observable<any> {
    return from(bcrypt.compare(newPassword, passwordHash));
  }
}
