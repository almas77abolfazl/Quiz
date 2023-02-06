import { NgModule } from '@angular/core';
import { MainComponent } from './main.component';
import { MainRoutes } from './main.routing';
import { QuestionComponent } from './components/question/question.component';
import { QuizPageComponent } from './components/quiz-page/quiz-page.component';
import { QuizResultComponent } from './components/quiz-result/quiz-result.component';
import { StartQuizComponent } from './components/start-quiz/start-quiz.component';
import { QuizService } from './services/quiz/quiz.service';
import { SharedModule } from '../shared/shared.module';
import { SelectQuizComponent } from './components/select-quiz/select-quiz.component';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';

export function tokenGetter() {
  return localStorage.getItem('x-access-token') as string;
}

const config: SocketIoConfig = {
  url: 'http://localhost:3000/',
  options: {
    extraHeaders: {
      Authorization:
        tokenGetter() ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2M2QyYTE2MzUyMzUzYzQxYjg1NmNiMTMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJkZWZhdWx0QGVtYWlsLmNvbSIsInJvbGUiOiJzYSIsImNyZWF0ZWRBdCI6IjIwMjMtMDEtMjZUMTU6NTA6NTkuNzcwWiIsInVwZGF0ZWRBdCI6IjIwMjMtMDItMDZUMTc6NDM6NDEuMTA1WiIsImFkZHJlc3MiOiLYtNmH2LHYs9iq2KfZhiDYqNmH2KfYsdiz2KrYp9mG2Iwg2LTZh9ixINqv2YTYs9iq2KfZhtiMINiu24zYp9io2KfZhiDZgtio2KfYr9uM2Iwg2qnZiNqG2Ycg2KjZhtmB2LTZhyA02Iwg2b7ZhNin2qkgNDTYjCDZiNin2K3YryAyINuM2KcgMSIsImZpcnN0TmFtZSI6Itin2KjZiNin2YTZgdi22YQiLCJnZW5kZXIiOiJtYWxlIiwibGFzdE5hbWUiOiLZhti124zYsduMINin2YTZhdin2LMiLCJpYXQiOjE2NzU3MDc0ODcsImV4cCI6MTY3NTcwODM4N30.JupDeTYIaXSVcueAf_EVMY9olkZisE0CaXe5DYp37DQ',
    },
  },
};
@NgModule({
  imports: [SharedModule, MainRoutes, SocketIoModule.forRoot(config)],
  declarations: [
    MainComponent,
    QuestionComponent,
    QuizPageComponent,
    QuizResultComponent,
    StartQuizComponent,
    SelectQuizComponent,
  ],
  providers: [QuizService],
})
export class MainModule {}
