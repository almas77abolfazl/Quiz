import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatInputModule, MatButtonModule],
  template: `
    <div class="login-container">
      <h2>ورود با شماره موبایل</h2>
      <mat-card>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="fill">
            <mat-label>شماره موبایل</mat-label>
            <input matInput formControlName="phone" type="tel" />
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>کد OTP</mat-label>
            <input matInput formControlName="code" type="text" />
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading">ورود</button>
        </form>
      </mat-card>
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
