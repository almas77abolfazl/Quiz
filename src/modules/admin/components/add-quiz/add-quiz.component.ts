import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  UntypedFormArray,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Question, QuestionOption } from 'src/models/models';
import { AdminService } from '../../services/admin/admin.service';

@Component({
  selector: 'app-add-quiz',
  templateUrl: './add-quiz.component.html',
  styleUrls: ['./add-quiz.component.scss'],
})
export class AddQuizComponent implements OnInit, OnDestroy {
  optionGroups: UntypedFormGroup[] = [];

  formGroup: UntypedFormGroup = new UntypedFormGroup({
    _id: new UntypedFormControl(null, []),
    __v: new UntypedFormControl(null, []),
    questionText: new UntypedFormControl(null, [Validators.required]),
    options: new UntypedFormArray(this.getOptionsFormGroup()),
  });

  subscriptions = new Subscription();
  isNew = true;

  constructor(
    private adminService: AdminService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadFormOnNavigation();
    this.onIsAnswerChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public saveQuestion(): void {
    if (this.formGroup.valid) {
      const options = this.formGroup.get('options');
      const isAnswersValues: QuestionOption[] = options?.value.filter(
        (option: QuestionOption) => option.isAnswer
      );

      if (isAnswersValues.length === 0) {
        alert('لطفا یکی از گزینه ها را به عنوان جواب تنظیم کنید.');
        return;
      }

      const question = this.formGroup.value;
      if (this.isNew) {
        this.subscriptions.add(
          this.adminService
            .addQuestion(this.removeNullProperties(question))
            .subscribe((res) => {
              if (res) {
                this.router.navigate(['admin/quiz-list']);
              }
            })
        );
      } else {
        this.adminService.updateQuestion(question).subscribe((res) => {
          if (res) {
            this.router.navigate(['admin/quiz-list']);
          }
        });
      }
    }
  }

  private getOptionsFormGroup(): AbstractControl[] {
    const controls: AbstractControl[] = [];
    for (let index = 0; index < 4; index++) {
      const optionsGroup = new UntypedFormGroup({
        _id: new UntypedFormControl(null, []),
        optionText: new UntypedFormControl(null, [Validators.required]),
        isAnswer: new UntypedFormControl(false),
      });
      controls.push(optionsGroup);
      this.optionGroups.push(optionsGroup);
    }
    return controls;
  }

  private loadFormOnNavigation() {
    const navigatedId = this.route.snapshot.paramMap.get('id');
    if (navigatedId) {
      this.adminService
        .getQuestion(navigatedId)
        .subscribe((question: Question) => {
          if (question) {
            this.isNew = false;
            this.formGroup.setValue(question);
          }
        });
    }
  }

  private onIsAnswerChanges() {
    const options = this.formGroup.get('options') as UntypedFormArray;

    const isAnswers: UntypedFormControl[] = [];
    options.controls.forEach((formGroup: any) => {
      isAnswers.push(formGroup.controls.isAnswer);
      formGroup.controls.isAnswer.valueChanges.subscribe((next: boolean) => {
        if (next) {
          isAnswers.forEach((isAnswer) => {
            if (isAnswer !== formGroup.controls.isAnswer) {
              isAnswer.setValue(false);
            }
          });
        }
      });
    });
  }

  private removeNullProperties(obj: any) {
    for (const propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined) {
        delete obj[propName];
      }
    }
    return obj;
  }
}
