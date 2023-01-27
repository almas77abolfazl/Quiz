import { Component, Injector } from '@angular/core';
import { ColDef } from 'ag-grid-community';

import { Command, User } from 'src/models/models';
import { ListBase } from 'src/modules/shared/base-classes/list.base';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent extends ListBase<User> {
  entityName = 'user';

  constructor(injector: Injector) {
    super(injector);
  }

  public processCommand(command: Command) {
    if (command.commandName === 'edit') {
      this.doEdit();
    }
  }

  protected getColumns(): ColDef[] {
    const columns: ColDef[] = [
      { headerName: 'labels.username', field: 'username' },
      { headerName: 'labels.email', field: 'email' },
      {
        headerName: 'labels.role',
        field: 'role',
      },
    ];
    return columns;
  }

  protected getCommands(): Command[] {
    const commands: Command[] = [
      {
        commandName: 'edit',
        label: 'labels.edit',
      },
    ];
    return commands;
  }

  protected virtualChangeStructureOfData(data: User[]): User[] {
    data.forEach((x) => {
      x.role = this.translateService.instant('enums.' + x.role);
    });
    return data;
  }

  private doEdit() {
    const userInfo = this.getUserInfo();
    if (!this.currentRow) {
      this.dialogService.showMessage('messages.selectItem');
      return;
    } else if (
      userInfo.role === 'admin' &&
      this.currentRow._id !== userInfo._id
    ) {
      this.dialogService.showMessage('messages.cannotEditOtherUserInformation');
      return;
    }
    this.router.navigate(['admin/user', this.currentRow._id]);
  }

  private getUserInfo(): User {
    return this.authenticationService.currentUserValue?.user as User;
  }
}
