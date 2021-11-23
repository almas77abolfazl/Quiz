import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { interval, Observable, Subscription, timer } from 'rxjs';
import { Quiz } from '../quiz-page.component';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
})
export class QuizComponent implements OnInit {
  @Output() requestForNextQuestion = new EventEmitter<boolean>();

  _data: Quiz = { question: '', options: ['', '', '', ''] };
  @Input() set data(data: Quiz) {
    if (data) {
      this._data = { question: data.question, options: data.options };

      this.subscription = this.quizTime.subscribe((x) => {
        this.timeNum = 10 - x;
        if (x === 10) {
          this.requestForNextQuestion.emit(true);
          this.subscription.unsubscribe();
        }
      });
    }
  }

  get data(): Quiz {
    return this._data;
  }

  form = new FormGroup({
    selectedOption: new FormControl(),
  });

  timeNum: number | undefined;
  quizTime = interval(1000);

  subscription: Subscription = new Subscription();

  constructor() {}

  ngOnInit() {}

  onSubmitClick() {
    const selectedOption = this.form.get('selectedOption');
    if (selectedOption?.value) {
      this.requestForNextQuestion.emit(true);
      this.subscription.unsubscribe();
    }
  }
}
