import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { CategoryModule } from './modules/category/category.module';
import { QuestionModule } from './modules/question/question.module';
import { UserModule } from './modules/user/user.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { SeasonModule } from './modules/season/season.module';
import { MatchModule } from './modules/match/match.module';
import { CoinModule } from './modules/coin/coin.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, CategoryModule, QuestionModule, UserModule, QuizModule, SeasonModule, MatchModule, CoinModule],
  controllers: [HealthController],
})
export class AppModule {}
