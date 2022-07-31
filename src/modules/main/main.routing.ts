import { MainComponent } from './main.component';
import { Routes, RouterModule } from '@angular/router';
import { QuizPageComponent } from './components/quiz-page/quiz-page.component';
import { QuizResultComponent } from './components/quiz-result/quiz-result.component';
import { StartQuizComponent } from './components/start-quiz/start-quiz.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'main',
    pathMatch: 'full',
  },
  {
    path: 'main',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'start-quiz', pathMatch: 'full' },
      { path: 'start-quiz', component: StartQuizComponent },
      { path: 'quiz-page', component: QuizPageComponent },
      { path: 'quiz-result', component: QuizResultComponent },
    ],
  },
];

export const MainRoutes = RouterModule.forChild(routes);
