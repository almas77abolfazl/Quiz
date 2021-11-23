import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuizPageComponent } from './quiz-page/quiz-page.component';
import { StartQuizComponent } from './start-quiz/start-quiz.component';

const routes: Routes = [
  { path: '', component: StartQuizComponent, pathMatch: 'full' },
  { path: 'quiz-page', component: QuizPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
