import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

import { IUser, Roles, Session, UserModel } from '../models/user.model';

// JWT Secret
const jwtSecret = '51778657246321226641fsdklafjasdkljfsklfjd7148924065';

export class UserController {
  constructor() {}

  public async addDefaultAdmin() {
    UserModel.find({ role: Roles.sa }).then(async (superAdmin) => {
      if (superAdmin.length === 0) {
        try {
          const newUser = new UserModel({
            username: 'admin',
            email: 'default@email.com',
            password: '123',
            role: Roles.sa,
          });
          this.hashPassWord(newUser);
          await newUser.save();
          await this.createSession(newUser);
          console.log('default admin successfully added.');
        } catch (error: any) {
          console.log(error);
        }
      }
    });
  }

  public async getUsers(req: Request, res: Response) {
    try {
      const allUsers = await UserModel.find({});
      allUsers.forEach((user) => {
        user.password = '';
      });
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
      await this.createSession(newUser);
      const accessToken = this.generateAccessAuthToken(newUser);
      newUser.password = '';
      const ResponseData = {
        user: newUser,
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
      await this.createSession(user);
      const accessToken = this.generateAccessAuthToken(user);
      user.password = '';
      const ResponseData = {
        user,
        accessToken,
      };
      res.send(ResponseData);
    } catch (error: any) {
      res.status(404).send(error.message);
    }
  }

  public async generateNewAccessToken(req: Request, res: Response) {
    try {
      let _id = req.header('_id') as string;
      const user = (await this.findUserById(_id)) as IUser;
      const accessToken = this.generateAccessAuthToken(user);
      res.send({ accessToken });
    } catch (error) {
      res.status(400).send(error);
    }
  }

  public async verifySession(req: Request, res: Response, next: NextFunction) {
    try {
      // grab the _id from the request header
      let _id = req.header('_id') as string;

      const user = await this.findUserById(_id);
      if (!user) {
        // user couldn't be found
        throw new Error(
          'User not found. Make sure that the refresh token and user id are correct'
        );
      }

      let refreshToken = user.sessions[user.sessions.length - 1].token;

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

  public authenticate(req: Request, res: Response, next: NextFunction) {
    let token = req.header('x-access-token') as string;

    // verify the JWT
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        // there was an error
        // jwt is invalid - * DO NOT AUTHENTICATE *
        res.status(401).send(err);
      } else {
        // jwt is valid

        next();
      }
    });
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
        expiresIn: '1m',
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

  private findUserById(_id: string) {
    // finds user by id and token
    // used in auth middleware (verifySession)

    return UserModel.findOne({
      _id,
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
