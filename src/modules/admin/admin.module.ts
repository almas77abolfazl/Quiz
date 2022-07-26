import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutes } from './admin.routing';
import { QuizListComponent } from './quiz-list/quiz-list.component';
import { AddQuizComponent } from './add-quiz/add-quiz.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AdminRoutes,
  ],
  declarations: [AdminComponent, AddQuizComponent, QuizListComponent],
})
export class AdminModule {}
