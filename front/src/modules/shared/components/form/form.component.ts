import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent {
  @Input() formGroup!: FormGroup<any>;
  @Output() onSaveClicked = new EventEmitter<any>();

  public save(): void {
    this.onSaveClicked.emit();
  }
}
