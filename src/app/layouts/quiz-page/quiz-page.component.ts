import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Question } from 'src/app/models/models';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
})
export class QuizPageComponent implements OnInit {
  question = {} as Question;
  questions: Question[] = [];
  randomId: number[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const subscription = this.http
      .get('/api/questions')
      .subscribe((res: any) => {
        this.questions = res;
        this.findNextQuestion();
        subscription.unsubscribe();
      });
  }

  public findNextQuestion(): void {
    const randomId = Math.floor(Math.random() * this.questions.length);
    if (randomId !== 0 && !this.randomId.includes(randomId)) {
      this.question = this.questions.find((x) => x.id === randomId) as Question;
      this.randomId.push(randomId);
    } else
      setTimeout(() => {
        this.findNextQuestion();
      }, 500);
  }
}
