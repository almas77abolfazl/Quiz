import { MainComponent } from './main.component';
import { Routes, RouterModule } from '@angular/router';
import { QuizPageComponent } from './components/quiz-page/quiz-page.component';
import { QuizResultComponent } from './components/quiz-result/quiz-result.component';
import { StartQuizComponent } from './components/start-quiz/start-quiz.component';
import { SelectQuizComponent } from './components/select-quiz/select-quiz.component';
import { ValidateTokenGuard } from 'src/quards/validateToken.guard';

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
      { path: '', redirectTo: 'select-quiz', pathMatch: 'full' },
      { path: 'select-quiz', component: SelectQuizComponent },
      { path: 'start-quiz', component: StartQuizComponent },
      {
        path: 'quiz-page',
        component: QuizPageComponent,
        canActivate: [ValidateTokenGuard],
      },
      { path: 'quiz-result', component: QuizResultComponent },
    ],
  },
];

export const MainRoutes = RouterModule.forChild(routes);
