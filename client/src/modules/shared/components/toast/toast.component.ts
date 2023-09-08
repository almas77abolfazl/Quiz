import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ToastService } from '../../services/toast/toast.service';
import { ToastConfig } from '../../services/toast/toast-config';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent implements OnInit {
  @ViewChild('toast') toast!: ElementRef;
  @ViewChild('toast') progress!: ElementRef;
  timer1!: any;
  timer2!: any;

  message!: string;
  detail!: string;
  isSuccess!: boolean;
  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.toastService.toastListener$.subscribe((toastConfig: ToastConfig) => {
      let time = 0;
      if (this.toast.nativeElement.classList.contains('active')) {
        this.toast.nativeElement.classList.remove('active');
        this.progress.nativeElement.classList.remove('active');
        clearTimeout(this.timer1);
        clearTimeout(this.timer2);
        time = 200;
      }

      const timeout = setTimeout(() => {
        this.message = toastConfig.message ?? '';
        this.detail = toastConfig.detail ?? '';
        this.isSuccess =
          typeof toastConfig.isSuccess == 'boolean'
            ? toastConfig.isSuccess
            : true;
        this.toast.nativeElement.classList.add('active');
        this.progress.nativeElement.classList.add('active');

        this.timer1 = setTimeout(() => {
          this.toast.nativeElement.classList.remove('active');
        }, 3000); //1s = 1000 milliseconds

        this.timer2 = setTimeout(() => {
          this.progress.nativeElement.classList.remove('active');
        }, 3300);
        clearTimeout(timeout);
      }, time);
    });
  }

  onCloseIconClick(toast: HTMLDivElement, progress: HTMLDivElement) {
    toast.classList.remove('active');
    setTimeout(() => {
      progress.classList.remove('active');
    }, 300);

    clearTimeout(this.timer1);
    clearTimeout(this.timer2);
  }
}
