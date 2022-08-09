import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Question } from 'src/models/models';
import { QuizService } from '../../services/quiz/quiz.service';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
})
export class QuizPageComponent implements OnInit, OnDestroy {
  question = {} as Question;
  randomId: number[] = [];

  subscriptions = new Subscription();

  constructor(private quizService: QuizService) {}

  ngOnInit(): void {
    this.findNextQuestion();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public findNextQuestion(): void {
    this.subscriptions.add(
      this.quizService.getRandomQuestion().subscribe((res: any) => {
        this.question = res.body[0];
      })
    );
  }
}
