import { Component, Injector } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Question, QuestionOption } from 'src/models/models';
import { FormBase } from 'src/modules/shared/base-classes/form.base';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
})
export class QuizComponent extends FormBase<Question> {
  //#region public variables

  entityName = 'questions';

  optionGroups: FormGroup[] = [];

  categories$ = this.webRequestService.get('category');

  //#endregion

  //#region Ctor

  constructor(injector: Injector) {
    super(injector);
  }

  //#endregion

  //#region protected methods

  protected getFormGroup(): FormGroup<any> {
    return new FormGroup({
      _id: new FormControl(null, []),
      __v: new FormControl(null, []),
      createdAt: new FormControl(null, []),
      updatedAt: new FormControl(null, []),
      questionText: new FormControl(null, [Validators.required]),
      categoryId: new FormControl(null, [Validators.required]),
      categoryTitle: new FormControl(null, []),
      level: new FormControl(null, [Validators.required]),
      options: new FormArray(this.getOptionsFormGroup()),
    });
  }

  protected virtualNgOnInit(): void {
    this.onIsAnswerChanges();
  }

  protected validateFormBeforeSave(): boolean {
    const options = this.formGroup.get('options');
    const isAnswersValues: QuestionOption[] = options?.value.filter(
      (option: QuestionOption) => option.isAnswer
    );
    if (isAnswersValues.length === 0) {
      alert('Messages.setOneOfTheOptionsAsAnswer');
      return false;
    }
    return this.formGroup.valid;
  }

  protected virtualAfterSave(): void {
    this.router.navigate(['admin/quiz-list']);
  }

  //#endregion

  //#region private methods

  private getOptionsFormGroup(): AbstractControl[] {
    const controls: AbstractControl[] = [];
    for (let index = 0; index < 4; index++) {
      const optionsGroup = new FormGroup({
        _id: new FormControl(null, []),
        optionText: new FormControl(null, [Validators.required]),
        isAnswer: new FormControl(false),
      });
      controls.push(optionsGroup);
      this.optionGroups.push(optionsGroup);
    }
    return controls;
  }

  private onIsAnswerChanges(): void {
    const options = this.getFromArray('options');

    const isAnswers: FormControl[] = [];
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

  //#endregion
}
