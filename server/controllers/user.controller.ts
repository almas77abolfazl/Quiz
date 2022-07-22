import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

import { IUser, UserModel } from '../models/user.model';

// JWT Secret
const jwtSecret = '51778657246321226641fsdklafjasdkljfsklfjd7148924065';

export class UserController {
  constructor() {}

  async createUser(req: Request, res: Response) {
    try {
      const newUser = new UserModel(req.body);
      await newUser.save();
      const refreshToken = await this.createSession(newUser);
      const accessToken = await this.generateAccessAuthToken(newUser);
      res
        .header('x-refresh-token', refreshToken)
        .header('x-access-token', accessToken)
        .send(newUser);
      res.status(200).send(newUser);
    } catch (error: any) {
      res.status(404).send(error.message);
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
}
