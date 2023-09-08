import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  @Output() registerSubmit = new EventEmitter<any>();

  registerForm!: UntypedFormGroup;

  // convenience getter for easy access to form fields
  get f() {
    return this.registerForm.controls;
  }

  constructor(private formBuilder: UntypedFormBuilder) {}

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['', [Validators.required,Validators.email]],
    });
  }

  onSubmit(): void {
    // stop here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }

    this.registerSubmit.emit(this.f);
  }
}
