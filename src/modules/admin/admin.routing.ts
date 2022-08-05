import { Routes, RouterModule } from '@angular/router';
import { QuizComponent } from './components/quiz/quiz.component';
import { AdminComponent } from './admin.component';
import { QuizListComponent } from './components/quiz-list/quiz-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { UserComponent } from './components/user/user.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'quiz', component: QuizComponent },
      { path: 'quiz/:id', component: QuizComponent },
      { path: 'quiz-list', component: QuizListComponent },
      { path: 'user/:id', component: UserComponent },
      { path: 'users-list', component: UsersListComponent },
    ],
  },
];

export const AdminRoutes = RouterModule.forChild(routes);
