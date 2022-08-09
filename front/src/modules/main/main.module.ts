import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './main.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MainRoutes } from './main.routing';
import { QuestionComponent } from './components/question/question.component';
import { QuizPageComponent } from './components/quiz-page/quiz-page.component';
import { QuizResultComponent } from './components/quiz-result/quiz-result.component';
import { StartQuizComponent } from './components/start-quiz/start-quiz.component';
import { QuizService } from './services/quiz/quiz.service';

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
  providers: [QuizService],
})
export class MainModule {}
