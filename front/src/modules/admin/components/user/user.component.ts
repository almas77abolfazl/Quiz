import { Component, Injector } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { User } from 'src/models/models';
import { FormBase } from 'src/modules/shared/base-classes/form.base';
import { DialogComponent } from 'src/modules/shared/components/dialog/dialog.component';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent extends FormBase<User> {
  entityName = 'users';

  constructor(
    injector: Injector,
    public dialogRef: MatDialogRef<UserComponent>
  ) {
    super(injector);
  }

  //#region public methods

  //#endregion

  protected getFormGroup(): FormGroup<any> {
    return new FormGroup({
      _id: new FormControl(null, []),
      __v: new FormControl(null, []),
      createdAt: new FormControl(null, []),
      updatedAt: new FormControl(null, []),
      username: new FormControl(null, [Validators.required]),
      email: new FormControl(null, [Validators.required]),
      role: new FormControl(null, [Validators.required]),
      password: new FormControl(null, [Validators.required]),
      firstName: new FormControl(null, []),
      lastName: new FormControl(null, []),
      gender: new FormControl(null, []),
      sessions: new FormControl(null, []),
      address: new FormControl(null, []),
    });
  }

  protected virtualAfterSave(entity: User): void {
    if (entity._id === this.authenticationService.currentUserValue?.user._id) {
      this.authenticationService.currentUserSubject.next({ user: entity });
    }
    if (!this.navigatedData.id) {
      this.router.navigate(['admin/users-list']);
    } else this.dialogRef.close();
  }

  protected validateFormBeforeSave(): boolean {
    const validation = !!this.getSubControl('password').value;

    if (!validation) {
      this.dialogService.showMessage('messages.passwordIsReq');
    }

    return validation;
  }
}
