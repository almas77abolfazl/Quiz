import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Question } from 'src/models/models';
import { QuizService } from 'src/services/quiz/quiz.service';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
})
export class QuizPageComponent implements OnInit {
  question = {} as Question;
  randomId: number[] = [];

  constructor(private quizService: QuizService) {}

  ngOnInit(): void {
    this.findNextQuestion();
  }

  public findNextQuestion(): void {
    const subscription = this.quizService
      .getRandomQuestion()
      .subscribe((res: any) => {
        this.question = res.body[0];
        subscription.unsubscribe();
      });
  }
}
