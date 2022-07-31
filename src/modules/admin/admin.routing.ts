import { Routes, RouterModule } from '@angular/router';
import { AddQuizComponent } from './components/add-quiz/add-quiz.component';
import { AdminComponent } from './admin.component';
import { QuizListComponent } from './components/quiz-list/quiz-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'add-quiz', component: AddQuizComponent },
      { path: 'quiz-list', component: QuizListComponent },
      { path: 'users-list', component: UsersListComponent },
    ],
  },
];

export const AdminRoutes = RouterModule.forChild(routes);
