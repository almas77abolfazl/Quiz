import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutes } from './admin.routing';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { AddQuizComponent } from './add-quiz/add-quiz.component';
import { AgGridModule } from 'ag-grid-angular';
import { UsersListComponent } from './users-list/users-list.component';
import { AdminService } from 'src/services/admin/admin.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AdminRoutes,
    AgGridModule,
  ],
  declarations: [
    AdminComponent,
    AddQuizComponent,
    QuizListComponent,
    UsersListComponent,
  ],
  providers: [AdminService],
})
export class AdminModule {}
