import { Component, Injector } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/models/models';
import { FormBase } from 'src/modules/shared/base-classes/form.base';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent extends FormBase<User> {
  entityName = 'users';

  constructor(injector: Injector) {
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

  protected virtualAfterSave(): void {
    // this.dialog.open();
    this.router.navigate(['admin/users-list']);
  }

  protected validateFormBeforeSave(): boolean {
    const validation = !!this.getSubControl('password').value;

    if (!validation) {
      this.dialogService.showMessage('messages.passwordIsReq');
    }

    return validation;
  }
}
