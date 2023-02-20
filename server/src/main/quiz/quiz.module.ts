import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionModule } from 'src/admin/question/question.module';
import { AuthModule } from 'src/core/auth/auth.module';
import { UserModule } from 'src/core/user/user.module';
import { User, UserSchema } from 'src/core/user/user.schema';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.getaway';
import { QuizService } from './quiz.service';
import { QuizResult, QuizResultSchema } from './schema/quiz-result.schema';
import { Quiz, QuizSchema } from './schema/quiz.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizResult.name, schema: QuizResultSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    QuestionModule,
    UserModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizGateway],
  exports: [],
})
export class QuizModule {}
