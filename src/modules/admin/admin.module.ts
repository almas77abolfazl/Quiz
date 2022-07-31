import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';

import { AdminRoutes } from './admin.routing';
import { AdminService } from './services/admin/admin.service';

import { AdminComponent } from './admin.component';
import { AddQuizComponent } from './components/add-quiz/add-quiz.component';
import { QuizListComponent } from './components/quiz-list/quiz-list.component';
import { UsersListComponent } from './components/users-list/users-list.component';

@NgModule({
  imports: [SharedModule, AdminRoutes],
  declarations: [
    AdminComponent,
    AddQuizComponent,
    QuizListComponent,
    UsersListComponent,
  ],
  providers: [AdminService],
})
export class AdminModule {}
