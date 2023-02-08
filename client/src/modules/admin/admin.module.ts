import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminRoutes } from './admin.routing';
import { AdminComponent } from './admin.component';
import { QuestionComponent } from './components/question/question.component';
import { QuestionListComponent } from './components/question-list/question-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { UserComponent } from './components/user/user.component';
import { CategoryComponent } from './components/category/category.component';
import { CategoryListComponent } from './components/category-list/category-list.component';

@NgModule({
  imports: [SharedModule, AdminRoutes],
  declarations: [
    AdminComponent,
    QuestionComponent,
    QuestionListComponent,
    UsersListComponent,
    UserComponent,
    CategoryComponent,
    CategoryListComponent,
  ],
  providers: [],
})
export class AdminModule {}
