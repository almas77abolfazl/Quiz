import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h2>ورود با شماره موبایل</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>شماره موبایل</label>
        <input formControlName="phone" type="tel" />
        <label>کد OTP</label>
        <input formControlName="code" type="text" />
        <button type="submit" [disabled]="form.invalid || loading">ورود</button>
      </form>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 2rem auto;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `]
})
export class LoginComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = this.fb.group({
      phone: [''],
      code: [''],
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { phone, code } = this.form.value;
    this.auth.verifyOtp(phone, code).subscribe({
      next: (res) => {
        this.auth.setAccessToken(res.accessToken);
        this.router.navigate(['/']);
      },
      error: () => (this.loading = false),
    });
  }
}
