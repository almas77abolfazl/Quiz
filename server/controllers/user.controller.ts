import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

import { IUser, Session, UserModel } from '../models/user.model';

// JWT Secret
const jwtSecret = '51778657246321226641fsdklafjasdkljfsklfjd7148924065';

export class UserController {
  constructor() {}

  public async getUsers(req: Request, res: Response) {
    try {
      const allUsers = await UserModel.find({});
      res.status(200).send(allUsers);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  public async createUser(req: Request, res: Response) {
    try {
      const newUser = new UserModel(req.body);
      this.hashPassWord(newUser);
      await newUser.save();
      const refreshToken = await this.createSession(newUser);
      const accessToken = await this.generateAccessAuthToken(newUser);
      newUser.password = '';
      const ResponseData = {
        user: newUser,
        refreshToken,
        accessToken,
      };
      res.status(200).send(ResponseData);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  }

  public async login(req: Request, res: Response) {
    try {
      let username = req.body.username;
      let password = req.body.password;
      const user = await this.findByCredentials(username, password);
      const refreshToken = await this.createSession(user);
      const accessToken = await this.generateAccessAuthToken(user);
      user.password = '';
      const ResponseData = {
        user,
        refreshToken,
        accessToken,
      };
      res.send(ResponseData);
    } catch (error: any) {
      res.status(404).send(error.message);
    }
  }

  public async generateNewAccessToken(req: Request, res: Response) {
    try {
      let username = req.body.username;
      let password = req.body.password;
      const user = await this.findByCredentials(username, password);
      const refreshToken = await this.createSession(user);
      const accessToken = await this.generateAccessAuthToken(user);
      user.password = '';
      const ResponseData = {
        user,
        refreshToken,
        accessToken,
      };
      res.send(ResponseData);
    } catch (error: any) {
      res.status(404).send(error.message);
    }
  }

  public async verifySession(req: Request, res: Response, next: NextFunction) {
    // grab the refresh token from the request header

    try {
      let refreshToken = req.header('x-refresh-token') as string;

      // grab the _id from the request header
      let _id = req.header('_id') as string;

      const user = await this.findByIdAndToken(_id, refreshToken);
      if (!user) {
        // user couldn't be found
        throw new Error(
          'User not found. Make sure that the refresh token and user id are correct'
        );
      }

      // if the code reaches here - the user was found
      // therefore the refresh token exists in the database - but we still have to check if it has expired or not

      // req.user_id = user._id;
      // req.userObject = user;
      // req.refreshToken = refreshToken;

      let isSessionValid = false;

      user.sessions.forEach((session: Session) => {
        if (session.token === refreshToken) {
          // check if the session has expired
          if (this.hasRefreshTokenExpired(session.expiresAt) === false) {
            // refresh token has not expired
            isSessionValid = true;
          }
        }
      });

      if (isSessionValid) {
        // the session is VALID - call next() to continue with processing this web request
        next();
      } else {
        // the session is not valid
        throw new Error('Refresh token has expired or the session is invalid');
      }
    } catch (error) {
      res.status(401).send(error);
    }
  }

  private hashPassWord(user: IUser) {
    let costFactor = 10;

    if (user.isModified('password')) {
      // if the password field has been edited/changed then run this code.

      // Generate salt and hash password
      bcrypt.genSalt(costFactor, (err, salt) => {
        bcrypt.hash(user.password, salt, (err, hash) => {
          user.password = hash;
        });
      });
    }
  }

  private async createSession(user: IUser) {
    try {
      let refreshToken = await this.generateRefreshAuthToken();
      refreshToken = await this.saveSessionToDatabase(user, refreshToken);
      return refreshToken;
    } catch (error) {
      throw error;
    }
  }

  private generateAccessAuthToken(user: IUser) {
    // Create the JSON Web Token and return that
    try {
      const token = jwt.sign({ _id: user._id.toHexString() }, jwtSecret, {
        expiresIn: '15m',
      });
      return token;
    } catch (error) {
      throw error;
    }
  }

  private generateRefreshAuthToken(): Promise<string> {
    // This method simply generates a 64byte hex string - it doesn't save it to the database. saveSessionToDatabase() does that.
    return new Promise((resolve, reject) => {
      crypto.randomBytes(64, (err, buf) => {
        if (!err) {
          // no error
          let token = buf.toString('hex');

          return resolve(token);
        }
      });
    });
  }

  private saveSessionToDatabase(
    user: IUser,
    refreshToken: string
  ): Promise<string> {
    // Save session to database
    return new Promise((resolve, reject) => {
      let expiresAt = this.generateRefreshTokenExpiryTime();

      user.sessions.push({ token: refreshToken, expiresAt: expiresAt });

      user
        .save()
        .then(() => {
          // saved session successfully
          return resolve(refreshToken);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  private generateRefreshTokenExpiryTime(): number {
    let daysUntilExpire = 10;
    let secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
    return Date.now() / 1000 + secondsUntilExpire;
  }

  private async findByCredentials(
    username: string,
    password: string
  ): Promise<IUser> {
    const user = await UserModel.findOne({ username });
    if (!user) throw new Error('not find');
    console.log(user);

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          return resolve(user);
        } else {
          throw new Error('passwordNotMatched');
        }
      });
    });
  }

  private findByIdAndToken(_id: string, token: string) {
    // finds user by id and token
    // used in auth middleware (verifySession)

    const User = this;

    return UserModel.findOne({
      _id,
      'sessions.token': token,
    });
  }

  private hasRefreshTokenExpired(expiresAt: number) {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch) {
      // hasn't expired
      return false;
    } else {
      // has expired
      return true;
    }
  }
}
