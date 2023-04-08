import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent {
  @Input() formGroup!: FormGroup<any>;
  @Output() onSaveClicked = new EventEmitter<any>();

  public save(isKeyDown?: boolean, event?: Event): void {
    if (isKeyDown) {
      event?.preventDefault();
      event?.stopPropagation();
    }
    this.onSaveClicked.emit();
  }
}
