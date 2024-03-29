import { Component, Injector } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { Category, Question, QuestionOption } from 'src/models/models';
import { FormBase } from 'src/modules/shared/base-classes/form.base';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss'],
})
export class QuestionComponent extends FormBase<Question> {
  //#region public variables

  entityName = 'question';

  optionGroups: FormGroup[] = [];

  categories$ = this.webRequestService.get('category') as Observable<
    Category[]
  >;

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
      category: new FormControl(null, [Validators.required]),
      level: new FormControl(null, [Validators.required]),
      options: new FormArray(this.getOptionsFormGroup()),
    });
  }

  protected virtualNgOnInit(): void {
    this.onIsAnswerChanges();
    this.onCategoryIdChanges();
  }

  protected validateFormBeforeSave(): boolean {
    const options = this.formGroup.get('options');
    const isAnswersValues: QuestionOption[] = options?.value.filter(
      (option: QuestionOption) => option.isAnswer
    );
    if (isAnswersValues.length === 0) {
      this.dialogService.showMessage('messages.setOneOfTheOptionsAsAnswer');
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
        optionText: new FormControl(null, [Validators.required]),
        isAnswer: new FormControl(false),
        _id: new FormControl(null),
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

  private onCategoryIdChanges() {
    const formGroup = this.getSubFormGroup('category');
    this.subscriptions.add(
      formGroup.get('_id')?.valueChanges.subscribe((newValue) => {
        if (newValue) {
          this.subscriptions.add(
            this.categories$.subscribe((categories) => {
              const selectedCategory = categories.find(
                (x) => x._id === newValue
              );
              formGroup.get('title')?.setValue(selectedCategory?.title);
            })
          );
        }
      })
    );
  }

  //#endregion
}
