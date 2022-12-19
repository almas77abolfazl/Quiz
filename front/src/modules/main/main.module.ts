import { NgModule } from '@angular/core';
import { MainComponent } from './main.component';
import { MainRoutes } from './main.routing';
import { QuestionComponent } from './components/question/question.component';
import { QuizPageComponent } from './components/quiz-page/quiz-page.component';
import { QuizResultComponent } from './components/quiz-result/quiz-result.component';
import { StartQuizComponent } from './components/start-quiz/start-quiz.component';
import { QuizService } from './services/quiz/quiz.service';
import { SharedModule } from '../shared/shared.module';
import { SelectQuizComponent } from './components/select-quiz/select-quiz.component';

@NgModule({
  imports: [SharedModule, MainRoutes],
  declarations: [
    MainComponent,
    QuestionComponent,
    QuizPageComponent,
    QuizResultComponent,
    StartQuizComponent,
    SelectQuizComponent,
  ],
  providers: [QuizService],
})
export class MainModule {}
