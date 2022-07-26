import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutes } from './admin.routing';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { AddQuizComponent } from './add-quiz/add-quiz.component';
import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AdminRoutes,
    AgGridModule
  ],
  declarations: [AdminComponent, AddQuizComponent, QuizListComponent],
})
export class AdminModule {}
