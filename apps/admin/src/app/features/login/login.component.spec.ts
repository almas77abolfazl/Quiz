import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { signal } from '@angular/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      isLoading: signal(false),
      authError: signal(null),
      isAuthenticated: signal(false),
      isStaff: signal(false),
      requestOtp: vi.fn().mockReturnValue(of({ expiresInSeconds: 300 })),
      verifyOtp: vi.fn().mockReturnValue(of({ id: 'u1', role: 'ROOT_ADMIN' })),
      setAuthError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should initialize at phone step with invalid form by default', () => {
    fixture.detectChanges();
    expect(component.step()).toBe('phone');
    expect(component.phoneForm.valid).toBe(false);
  });

  it('should request OTP on valid phone number submission and transition to OTP step', () => {
    fixture.detectChanges();
    component.phoneForm.controls.phone.setValue('09120000001');
    expect(component.phoneForm.valid).toBe(true);

    component.onSendOtp();

    expect(authServiceMock.requestOtp).toHaveBeenCalledWith('09120000001');
    expect(component.step()).toBe('otp');
    expect(component.successMessage()).toContain('کد تایید شش‌رقمی به شماره موبایل شما ارسال شد');
  });

  it('should display error message on invalid OTP verification attempt', () => {
    authServiceMock.verifyOtp.mockReturnValue(throwError(() => new Error('Invalid OTP')));
    authServiceMock.authError.set('کد تایید وارد شده نامعتبر یا منقضی شده است.');

    fixture.detectChanges();
    component.phoneForm.controls.phone.setValue('09120000001');
    component.onSendOtp();

    component.otpForm.controls.code.setValue('123456');
    component.onVerifyOtp();

    expect(component.errorMessage()).toContain('کد تایید وارد شده نامعتبر یا منقضی شده است');
  });
});
