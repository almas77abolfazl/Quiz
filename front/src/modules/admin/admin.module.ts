import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';

import { AdminRoutes } from './admin.routing';
import { AdminService } from './services/admin/admin.service';

import { AdminComponent } from './admin.component';
import { QuizComponent } from './components/quiz/quiz.component';
import { QuizListComponent } from './components/quiz-list/quiz-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { UserComponent } from './components/user/user.component';
import { CategoryComponent } from './components/category/category.component';
import { CategoryListComponent } from './components/category-list/category-list.component';

@NgModule({
  imports: [SharedModule, AdminRoutes],
  declarations: [
    AdminComponent,
    QuizComponent,
    QuizListComponent,
    UsersListComponent,
    UserComponent,
    CategoryComponent,
    CategoryListComponent,
  ],
  providers: [AdminService],
})
export class AdminModule {}
