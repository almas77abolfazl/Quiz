type ToastLocType = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export class ToastConfig {
  message? = 'Success.';
  detail? = 'Success.';
  location?: ToastLocType = 'top-right';
  isSuccess? = true;

  constructor(
    message?: string,
    detail?: string,
    location?: ToastLocType,
    isSuccess?: boolean
  ) {
    if (message) this.message = message;
    if (detail) this.detail = detail;
    if (location) this.location = location;
    if (typeof isSuccess === 'boolean') this.isSuccess = isSuccess;
  }
}
