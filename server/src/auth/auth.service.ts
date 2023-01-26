import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { from, map, mergeMap, Observable, of } from 'rxjs';
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

  public async signUp(body: SignupDto): Promise<{
    accessToken: string;
    user: Partial<UserRepository>;
  }> {
    const doesUserExist = await this.doesUserExist(body.email, body.username);
    if (doesUserExist) {
      throw new UnprocessableEntityException(
        'A user has already been created with this email or username address',
      );
    } else {
      const hashedPassword = await this.hashPassword(body.password);
      const newUser = new UserRepository();
      newUser.username = body.username;
      newUser.email = body.email;
      newUser.password = hashedPassword;
      newUser.sessions = [];
      await this.createSession(newUser);
      const { password, sessions, ...user } = newUser;
      const accessToken = this.generateJWT(user);
      return { accessToken, user };
    }
  }

  public async signIn(
    user: SignInDto,
  ): Promise<{ accessToken: string; user: Partial<UserRepository> }> {
    const validUser = await this.validateUser(user.username, user.password);
    if (validUser) {
      const sessionIsCreated = this.createSession(validUser);
      if (sessionIsCreated) {
        const { password, sessions, ...user } = validUser;
        const accessToken = this.generateJWT(user);
        return { accessToken, user };
      }
    }
  }

  private async doesUserExist(
    email: string,
    username: string,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: {
        email,
        username,
      },
    });
    return !!user;
  }

  public hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Generate salt and hash password
      const costFactor = 10;
      bcrypt.genSalt(costFactor, (err, salt) => {
        if (err) {
          reject(err);
        } else {
          bcrypt.hash(password, salt, (err, hash) => {
            if (err) {
              reject(err);
            } else {
              resolve(hash);
            }
          });
        }
      });
    });
  }

  private generateJWT(user: Partial<UserRepository>): string {
    return this.jwtService.sign(user, { expiresIn: '15m' });
  }

  private async createSession(user: Partial<UserRepository>): Promise<boolean> {
    const refreshToken = await this.generateRefreshAuthToken();
    const sessionIsCreated = await this.saveSessionToDatabase(
      user,
      refreshToken,
    );
    return sessionIsCreated;
  }

  private generateRefreshAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(64, (err, buf) => {
        if (!err) {
          const token = buf.toString('hex');
          return resolve(token);
        } else reject(''); //TODO
      });
    });
  }

  private async saveSessionToDatabase(
    user: Partial<UserRepository>,
    refreshToken: string,
  ): Promise<boolean> {
    const expiresAt = this.generateRefreshTokenExpiryTime();
    user.sessions.push({ token: refreshToken, expiresAt });
    const savedUser = await this.userRepository.save([user]);
    return !!savedUser;
  }

  private generateRefreshTokenExpiryTime(): number {
    const daysUntilExpire = 10;
    const secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
    return Date.now() / 1000 + secondsUntilExpire;
  }

  private async validateUser(
    username: string,
    pass: string,
  ): Promise<Partial<UserRepository>> {
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['email', '_id', 'username', 'password', 'sessions'],
    });
    if (user) {
      const passwordIsMatch = await this.comparePasswords(pass, user.password);
      if (!passwordIsMatch) {
        throw new HttpException(
          'messages.passwordNotMatched',
          HttpStatus.FORBIDDEN,
        );
      }
      return user;
    } else
      throw new HttpException(
        'messages.passwordNotMatched',
        HttpStatus.FORBIDDEN,
      );
  }

  private comparePasswords(
    newPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      bcrypt.compare(newPassword, passwordHash, (err, res) => {
        if (res) return resolve(true);
        else reject(false);
      });
    });
  }
}
