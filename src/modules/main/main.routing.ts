import { MainComponent } from './main.component';
import { Routes, RouterModule } from '@angular/router';
import { StartQuizComponent } from './start-quiz/start-quiz.component';
import { QuizPageComponent } from './quiz-page/quiz-page.component';
import { QuizResultComponent } from './quiz-result/quiz-result.component';

const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [
      { path: 'start-quiz', component: StartQuizComponent },
      { path: 'quiz-page', component: QuizPageComponent },
      { path: 'quiz-result', component: QuizResultComponent },
    ],
  },
];

export const MainRoutes = RouterModule.forChild(routes);
