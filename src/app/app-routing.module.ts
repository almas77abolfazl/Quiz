import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddQuizComponent } from './add-quiz/add-quiz.component';
import { QuizPageComponent } from './quiz-page/quiz-page.component';
import { QuizResultComponent } from './quiz-result/quiz-result.component';
import { StartQuizComponent } from './start-quiz/start-quiz.component';

const routes: Routes = [
  { path: '', component: StartQuizComponent, pathMatch: 'full' },
  { path: 'quiz-page', component: QuizPageComponent },
  { path: 'quiz-result', component: QuizResultComponent },
  { path: 'add-quiz', component: AddQuizComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
