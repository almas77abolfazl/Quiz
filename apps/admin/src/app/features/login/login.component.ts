import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly step = signal<'phone' | 'otp'>('phone');
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly authServiceLoading = this.authService.isLoading;
  readonly authServiceError = this.authService.authError;

  readonly phoneForm = this.fb.nonNullable.group({
    phone: ['', [Validators.required, Validators.pattern(/^09\d{9}$/)]],
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  private returnUrl = '/dashboard';

  ngOnInit(): void {
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (queryReturnUrl) {
      this.returnUrl = queryReturnUrl;
    }

    if (this.authService.isAuthenticated() && this.authService.isStaff()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onSendOtp(): void {
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    const phone = this.phoneForm.getRawValue().phone.trim();

    this.authService.requestOtp(phone).subscribe({
      next: () => {
        this.step.set('otp');
        this.successMessage.set('کد تایید شش‌رقمی به شماره موبایل شما ارسال شد.');
      },
      error: (err) => {
        const errorMsg = this.authServiceError() || 'خطا در درخواست کد تایید.';
        this.errorMessage.set(errorMsg);
      },
    });
  }

  onVerifyOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    const phone = this.phoneForm.getRawValue().phone.trim();
    const code = this.otpForm.getRawValue().code.trim();

    this.authService.verifyOtp(phone, code).subscribe({
      next: () => {
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        const errorMsg = this.authServiceError() || 'کد تایید وارد شده نامعتبر یا منقضی شده است.';
        this.errorMessage.set(errorMsg);
      },
    });
  }

  onChangePhone(): void {
    this.step.set('phone');
    this.otpForm.reset();
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.authService.setAuthError(null);
  }
}
