import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { MongoRepository } from 'typeorm';
import { Roles, UserRepository } from './user.repository';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: MongoRepository<UserRepository>,
    private authService: AuthService,
  ) {}

  async onApplicationBootstrap() {
    const saUser = await this.userRepository.findOne({
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
      await this.userRepository.save([saUser]);
      console.log('default admin successfully added.');
    }
  }
}
