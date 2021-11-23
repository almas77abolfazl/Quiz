import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
})
export class QuizPageComponent implements OnInit {


  data = {} as Quiz;

  constructor() {}

  ngOnInit(): void {
    this.data = {
      question: 'بزرگترین دریاچه جهان چه نام دارد ؟',
      options: ['خزر', 'خزر', 'خزر', 'خزر'],
    };
  }

  requestForNextQuestion(){
    this.data = {
      question: 'آب دریا چه رنگی میباشد؟',
      options: ['قرمز', 'آبی', 'سبز', 'سیاه'],
    }
  }
}

export interface Quiz {
  question: string;
  options: string[];
}
