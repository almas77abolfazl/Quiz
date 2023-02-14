import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Question } from 'src/models/models';
import { QuizService } from '../../services/quiz/quiz.service';

const timeNum = 30;
@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss'],
})
export class QuestionComponent {
  @Output() requestForNextQuestion = new EventEmitter<string>();

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
  subscription!: Subscription;

  constructor(private router: Router, private quizService: QuizService) {}

  public onSubmitClick(): void {
    const answerControl = this.formGroup.get('answer');
    if (answerControl?.value) {
      this.goNextQuestion(answerControl.value);
      answerControl.reset();
    }
  }

  public quizEnded(): void {
    this.router.navigate(['main/quiz-result'], {
      state: { quizId: this.quizService.quizId },
    });
  }

  private setCountDown(): void {
    this.questionNumber += 1;
    const countDown$ = interval(1000).pipe(take(timeNum));
    this.subscription = countDown$.subscribe((val: any) => {
      this.timeNum = timeNum - (val + 1);
      if (this.timeNum === 0) this.goNextQuestion('');
    });
  }

  private goNextQuestion(userAnswerId: string): void {
    this.timeNum = timeNum;
    this.requestForNextQuestion.emit(userAnswerId);
    this.subscription.unsubscribe();
  }
}
