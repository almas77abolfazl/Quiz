import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './main.component';
import { QuestionComponent } from './question/question.component';
import { QuizPageComponent } from './quiz-page/quiz-page.component';
import { QuizResultComponent } from './quiz-result/quiz-result.component';
import { StartQuizComponent } from './start-quiz/start-quiz.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MainRoutes } from './main.routing';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MainRoutes,
  ],
  declarations: [
    MainComponent,
    QuestionComponent,
    QuizPageComponent,
    QuizResultComponent,
    StartQuizComponent,
  ],
})
export class MainModule {}
