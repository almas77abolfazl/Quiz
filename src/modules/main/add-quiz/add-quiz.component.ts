import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-quiz',
  templateUrl: './add-quiz.component.html',
  styleUrls: ['./add-quiz.component.scss'],
})
export class AddQuizComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({
    questionText: new FormControl(null, [Validators.required]),
    firstOption: new FormControl(null, [Validators.required]),
    secondOption: new FormControl(null, [Validators.required]),
    thirdOption: new FormControl(null, [Validators.required]),
    fourthOption: new FormControl(null, [Validators.required]),
  });

  constructor(private httpClient: HttpClient) {}

  ngOnInit(): void {}

  public saveQuestion(): void {
    // if (this.formGroup.valid === true) {
    //   this.httpClient
    //     .post(`api/questions/}`, {
    //       question: this.formGroup.get('questionText')?.value,
    //       options: [
    //         { id: 1, description: this.formGroup.get('firstOption')?.value },
    //         { id: 2, description: this.formGroup.get('secondOption')?.value },
    //         { id: 3, description: this.formGroup.get('thirdOption')?.value },
    //         { id: 4, description: this.formGroup.get('fourthOption')?.value },
    //       ],
    //     })
    //     .subscribe();
    // }
  }
}
