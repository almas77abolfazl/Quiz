import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { QuestionModule } from './question/question.module';
import { CategoryModule } from './category/category.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    UserModule,
    AuthModule,
    QuestionModule,
    CategoryModule,
    MongooseModule.forRoot('mongodb://127.0.0.1/Quiz'),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
