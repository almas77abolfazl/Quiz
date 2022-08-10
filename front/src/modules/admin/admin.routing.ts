import { Routes, RouterModule } from '@angular/router';
import { QuizComponent } from './components/quiz/quiz.component';
import { AdminComponent } from './admin.component';
import { QuizListComponent } from './components/quiz-list/quiz-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { UserComponent } from './components/user/user.component';
import { CategoryComponent } from './components/category/category.component';
import { CategoryListComponent } from './components/category-list/category-list.component';

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
      { path: 'category', component: CategoryComponent },
      { path: 'category-list', component: CategoryListComponent },
    ],
  },
];

export const AdminRoutes = RouterModule.forChild(routes);
