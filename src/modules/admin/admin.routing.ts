import { Routes, RouterModule } from '@angular/router';
import { AddQuizComponent } from './add-quiz/add-quiz.component';
import { AdminComponent } from './admin.component';
import { QuizListComponent } from './quiz-list/quiz-list.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'add-quiz', component: AddQuizComponent },
      { path: 'quiz-list', component: QuizListComponent },
    ],
  },
];

export const AdminRoutes = RouterModule.forChild(routes);
