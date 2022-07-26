import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

import { IUser, UserModel } from '../models/user.model';

// JWT Secret
const jwtSecret = '51778657246321226641fsdklafjasdkljfsklfjd7148924065';

export class UserController {
  constructor() {}

  async createUser(req: Request, res: Response) {
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
      res.status(404).send(error.message);
    }
  }

  async login(req: Request, res: Response) {
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
}
