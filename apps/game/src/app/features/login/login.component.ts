import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class LoginComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly step = signal<number>(1);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly resendSeconds = signal<number>(60);
  private timerRef: ReturnType<typeof setInterval> | null = null;

  readonly phoneForm: FormGroup = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^09[0-9]{9}$/)]],
  });

  readonly otpForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

  readonly maskedPhone = computed(() => {
    const phone = this.phoneForm.value.phone || '';
    if (phone.length === 11) {
      return `${phone.substring(0, 4)}***${phone.substring(7)}`;
    }
    return phone;
  });

  ngOnDestroy(): void {
    this.clearTimer();
  }

  sendOtp(): void {
    if (this.phoneForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const phone = this.phoneForm.value.phone;
    this.authService.requestOtp(phone).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.step.set(2);
        this.startResendTimer(res?.expiresInSeconds || 60);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'خطا در ارسال کد تأیید');
      },
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    const phone = this.phoneForm.value.phone;
    const code = this.otpForm.value.code;

    this.authService.verifyOtp(phone, code).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'کد وارد شده اشتباه یا منقضی شده است');
      },
    });
  }

  editPhone(): void {
    this.step.set(1);
    this.clearTimer();
    this.errorMessage.set('');
  }

  resendOtp(): void {
    if (this.resendSeconds() > 0) return;
    this.sendOtp();
  }

  private startResendTimer(seconds: number): void {
    this.clearTimer();
    this.resendSeconds.set(seconds);
    this.timerRef = setInterval(() => {
      if (this.resendSeconds() > 0) {
        this.resendSeconds.update((s) => s - 1);
      } else {
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerRef !== null) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }
}
