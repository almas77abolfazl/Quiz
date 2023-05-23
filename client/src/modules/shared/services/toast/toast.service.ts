import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ToastConfig } from './toast-config';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toastListener$: Subject<ToastConfig> = new Subject();

  showToast(toastConfig = new ToastConfig()) {
    this.toastListener$.next(toastConfig);
  }
}
