import { Routes, RouterModule } from '@angular/router';
import { QuestionComponent } from './components/question/question.component';
import { AdminComponent } from './admin.component';
import { QuestionListComponent } from './components/question-list/question-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { UserComponent } from './components/user/user.component';
import { CategoryComponent } from './components/category/category.component';
import { CategoryListComponent } from './components/category-list/category-list.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: 'quiz', component: QuestionComponent },
      { path: 'quiz/:id', component: QuestionComponent },
      { path: 'quiz-list', component: QuestionListComponent },
      { path: 'user/:id', component: UserComponent },
      { path: 'users-list', component: UsersListComponent },
      { path: 'category', component: CategoryComponent },
      { path: 'category/:id', component: CategoryComponent },
      { path: 'category-list', component: CategoryListComponent },
    ],
  },
];

export const AdminRoutes = RouterModule.forChild(routes);
