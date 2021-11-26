import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
})
export class QuizPageComponent implements OnInit {
  data = {} as Quiz;
  questions: Quiz[] = [];
  randomId!: number;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const subscription = this.http
      .get('/api/questions')
      .subscribe((res: any) => {
        this.questions = res;
        this.requestForNextQuestion();
        subscription.unsubscribe();
      });
  }

  requestForNextQuestion() {
    const randomId = createRandomId(this.questions.length);
    this.randomId =
      randomId !== this.randomId
        ? randomId
        : createRandomId(this.questions.length);
    this.data = this.questions.find((x) => x.id === this.randomId) as Quiz;

    function createRandomId(questionsLength: number) {
      return Math.floor(Math.random() * questionsLength);
    }
  }
}

export interface Quiz {
  id: number;
  question: string;
  options: QuizOptions[];
}

interface QuizOptions {
  id: number;
  description: string;
}
