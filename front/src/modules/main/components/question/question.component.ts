import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Question, UserAnswers } from 'src/models/models';

const timeNum = 30;
@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss'],
})
export class QuestionComponent {
  @Output() requestForNextQuestion = new EventEmitter<boolean>();

  _question!: Question;
  @Input() set question(data: Question) {
    if (data && data._id) {
      if (this.questionNumber === 10) {
        this.quizEnded();
        return;
      }
      this._question = {
        _id: data._id,
        questionText: data.questionText,
        options: data.options,
        category: data.category,
        level: data.level,
        creator: data.creator,
        // answerId: data.answerId,
      };
      this.setCountDown();
    }
  }

  get question(): Question {
    return this._question;
  }

  formGroup: UntypedFormGroup = new UntypedFormGroup({
    questionId: new UntypedFormControl(),
    answer: new UntypedFormControl(),
  });

  timeNum = timeNum;

  questionNumber = 0;

  sub!: Subscription;

  userAnswers: UserAnswers[] = [];

  constructor(private router: Router) {}

  public onSubmitClick(): void {
    const answerControl = this.formGroup.get('answer');
    if (answerControl?.value) {
      this.userAnswers.push({
        questionNumber: this.questionNumber,
        question: this.question,
        userAnswerId: answerControl.value,
      });
      answerControl.reset();
      this.goNextQuestion();
    }
  }

  private setCountDown() {
    this.questionNumber += 1;

    const countDown$ = interval(1000).pipe(take(timeNum));
    this.sub = countDown$.subscribe((val: any) => {
      this.timeNum = timeNum - (val + 1);
      if (this.timeNum === 0) {
        this.goNextQuestion();
      }
    });
  }

  private goNextQuestion(): void {
    this.timeNum = timeNum;
    this.requestForNextQuestion.emit(true);
    this.sub.unsubscribe();
  }

  private quizEnded(): void {
    this.router.navigate(['main/quiz-result'], {
      state: { userAnswers: this.userAnswers },
    });
  }
}
