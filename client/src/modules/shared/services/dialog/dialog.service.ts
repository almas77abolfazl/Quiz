import { NoopScrollStrategy } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DialogComponent } from '../../components/dialog/dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  showMessage(message: string, callback?: Function) {
    this.dialog.open(DialogComponent, {
      data: {
        message: message,
        buttons: ['ok'],
        onClose: () => (callback ? callback() : () => {}),
      },
      direction: 'rtl',
      scrollStrategy: new NoopScrollStrategy()
    });
  }

  showComponent(component: any, config: MatDialogConfig) {
    this.dialog.open(component, config);
  }
}
