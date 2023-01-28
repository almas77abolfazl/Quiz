import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignInDto } from './dto/signin.dto';
import { User, UserDocument } from 'src/user/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  public async signUp(body: SignupDto): Promise<{
    accessToken: string;
    user: Partial<User>;
  }> {
    const doesUserExist = await this.doesUserExist(body.email, body.username);
    if (doesUserExist) {
      throw new UnprocessableEntityException(
        'A user has already been created with this email or username address',
      );
    } else {
      const hashedPassword = await this.hashPassword(body.password);
      const newUser = {} as User;
      newUser.username = body.username;
      newUser.email = body.email;
      newUser.password = hashedPassword;
      newUser.sessions = [];
      newUser.createdAt = new Date();
      await this.createSession(newUser);
      const { password, sessions, ...user } = newUser;
      const accessToken = this.generateJWT(user);
      return { accessToken, user };
    }
  }

  public async signIn(
    signInDto: SignInDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const validUser = await this.validateUser(
      signInDto.username,
      signInDto.password,
    );
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
    const user = await this.model.findOne({ email, username });
    return !!user;
  }

  public hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const costFactor = 10;
      bcrypt.genSalt(costFactor, (err: any, salt: any) => {
        if (err) {
          reject(err);
        } else {
          bcrypt.hash(password, salt, (err: any, hash: string) => {
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

  private generateJWT(user: Partial<User>): string {
    return this.jwtService.sign(user, { expiresIn: '15m' });
  }

  private async createSession(user: Partial<User>): Promise<boolean> {
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
    user: Partial<User>,
    refreshToken: string,
  ): Promise<boolean> {
    const expiresAt = this.generateRefreshTokenExpiryTime();
    user.sessions.push({ token: refreshToken, expiresAt });
    const savedUser = await new this.model(user).save();
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
  ): Promise<Partial<User>> {
    const user = await this.model.findOne({ username }).lean();
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
      bcrypt.compare(newPassword, passwordHash, (err: any, res: any) => {
        if (res) return resolve(true);
        else reject(false);
      });
    });
  }
}
