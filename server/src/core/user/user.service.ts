import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles, User, UserDocument } from './user.schema';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
    private authService: AuthService,
  ) {}

  async onApplicationBootstrap() {
    const saUser = await this.model.findOne({ role: Roles.sa });
    if (!saUser) {
      const saUser = {} as User;
      const hashPassword = await this.authService.hashPassword('123');
      saUser.username = 'admin';
      saUser.email = 'default@email.com';
      saUser.password = hashPassword;
      saUser.role = Roles.sa;
      saUser.sessions = [];
      await new this.model(saUser).save();
      console.log('default admin successfully added.');
    }
  }

  public async getAll(): Promise<User[]> {
    return await this.model.find().select(['username', 'email', 'role']).exec();
  }

  public async updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<Partial<User>> {
    const user = await this.getById(id);
    const hashPassword = await this.authService.hashPassword(body.password);
    body.password = hashPassword;
    Object.assign(user, body);
    const { password, ...otherInfo } = await this.model
      .findByIdAndUpdate(id, user)
      .lean()
      .exec();
    return otherInfo;
  }

  public async getById(id?: string): Promise<User> {
    return await this.model.findById(id).lean();
  }

  public async deleteById(id: string): Promise<User> {
    return await this.model.findByIdAndDelete(id).exec();
  }
}
