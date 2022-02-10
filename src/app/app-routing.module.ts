import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddQuizComponent } from './layouts/add-quiz/add-quiz.component';
import { QuizPageComponent } from './layouts/quiz-page/quiz-page.component';
import { QuizResultComponent } from './layouts/quiz-result/quiz-result.component';
import { StartQuizComponent } from './layouts/start-quiz/start-quiz.component';
import { LoginComponent } from './login/login/login.component';
import { AuthGuard } from './quards/auth.guard';

const routes: Routes = [
  { path: '', component: StartQuizComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'start-quiz', component: StartQuizComponent },
  { path: 'quiz-page', component: QuizPageComponent },
  { path: 'quiz-result', component: QuizResultComponent },
  { path: 'add-quiz', component: AddQuizComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
