import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { interval, Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';

import { Quiz } from '../quiz-page.component';

const timeNum = 3;
@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
})
export class QuizComponent implements OnInit {
  @Output() requestForNextQuestion = new EventEmitter<boolean>();

  _data: Quiz = {
    id: 1,
    question: '',
    options: [
      { id: 1, description: '' },
      { id: 2, description: '' },
      { id: 3, description: '' },
      { id: 4, description: '' },
    ],
  };

  sub!: Subscription;
  @Input() set data(data: Quiz) {
    if (data && data.id) {
      this.questionNumber += 1;
      this._data = {
        id: data.id,
        question: data.question,
        options: data.options,
      };

      const countDown$ = interval(1000).pipe(take(timeNum));


      this.sub = countDown$.subscribe((val: any) => {
        this.timeNum = timeNum - (val + 1);
        if (this.timeNum === 0) {
          this.goNextQuestion();
        }
      });

    }
  }

  private goNextQuestion() {
    this.timeNum = timeNum;
    this.requestForNextQuestion.emit(true);
    this.sub.unsubscribe();
  }

  get data(): Quiz {
    return this._data;
  }

  formGroup: FormGroup = new FormGroup({
    questionId: new FormControl(),
    answer: new FormControl(),
  });

  timeNum = timeNum;

  questionNumber = 0;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {}

  onSubmitClick() {
    const answerControl = this.formGroup.get('answer');
    if (answerControl?.value) {
      answerControl.reset();
      this.goNextQuestion();
    }
  }
}
