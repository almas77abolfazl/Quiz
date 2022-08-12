import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../components/dialog/dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  showMessage(message: string) {
    this.dialog.open(DialogComponent, {
      data: {
        message: message,
        buttons: ['ok'],
      },
      direction: 'rtl',
    });
  }
}
