import { NoopScrollStrategy } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig } from '@angular/material/legacy-dialog';
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
