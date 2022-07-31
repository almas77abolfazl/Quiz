import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  UntypedFormArray,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { QuestionOption } from 'src/models/models';
import { AdminService } from 'src/services/admin/admin.service';

@Component({
  selector: 'app-add-quiz',
  templateUrl: './add-quiz.component.html',
  styleUrls: ['./add-quiz.component.scss']
})
export class AddQuizComponent implements OnInit {
  optionGroups: UntypedFormGroup[] = [];

  formGroup: UntypedFormGroup = new UntypedFormGroup({
    questionText: new UntypedFormControl('', [Validators.required]),
    options: new UntypedFormArray(this.getOptionsFormGroup()),
  });

  constructor(private AdminService: AdminService,
    private router : Router) {}

  ngOnInit(): void {}

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
      this.AdminService.addQuestion(question).subscribe((res) => {
        if (res) {
          this.router.navigate(['admin/quiz-list'])
        }
      });
    }
  }

  private getOptionsFormGroup(): AbstractControl[] {
    const controls: AbstractControl[] = [];
    for (let index = 0; index < 4; index++) {
      const optionsGroup = new UntypedFormGroup({
        optionText: new UntypedFormControl('', [Validators.required]),
        isAnswer: new UntypedFormControl(false),
      });
      controls.push(optionsGroup);
      this.optionGroups.push(optionsGroup);
    }
    return controls;
  }
}
