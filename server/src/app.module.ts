import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryModule } from './admin/category/category.module';
import { QuestionModule } from './admin/question/question.module';
import { AuthModule } from './core/auth/auth.module';
import { UserModule } from './core/user/user.module';
import { ChatModule } from './main/chat/chat.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    QuestionModule,
    CategoryModule,
    ChatModule,
    MongooseModule.forRoot('mongodb://127.0.0.1/Quiz'),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
