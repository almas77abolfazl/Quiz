import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { MongoRepository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles, UserRepository } from './user.repository';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserRepository)
    private readonly repository: MongoRepository<UserRepository>,
    private authService: AuthService,
  ) {}

  async onApplicationBootstrap() {
    const saUser = await this.repository.findOne({
      where: {
        role: Roles.sa,
      },
    });
    if (!saUser) {
      const saUser = new UserRepository();
      const hashPassword = await this.authService.hashPassword('123');
      saUser.username = 'admin';
      saUser.email = 'default@email.com';
      saUser.password = hashPassword;
      saUser.role = Roles.sa;
      saUser.sessions = [];
      await this.repository.save([saUser]);
      console.log('default admin successfully added.');
    }
  }

  public async getAll(): Promise<UserRepository[]> {
    return await this.repository.find({});
  }

  public async updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<Partial<UserRepository>> {
    const user = await this.getById(id);
    Object.assign(user, body);
    const [{ password, ...otherInfo }] = await this.repository.save([user]);
    return otherInfo;
  }

  public async getById(id?: string): Promise<UserRepository> {
    const question = await this.repository.findOneById(id);
    return question;
  }
}
