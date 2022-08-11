import { Component, Injector } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { Observable } from 'rxjs';

import { Command, User } from 'src/models/models';
import { ListBase } from 'src/modules/shared/base-classes/list.base';
import { AuthenticationService } from 'src/modules/shared/services/authentication/authentication.service';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent extends ListBase<User> {
  entityName = 'users';

  constructor(
    injector: Injector,
    private authenticationService: AuthenticationService
  ) {
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

  protected virtualChangeStructureOfDataAsync(
    data: User[]
  ): Observable<User[]> {
    return new Observable((subscriber) => {
      data.forEach((x, idx, array) => {
        this.translateService
          .get(('enums.' + x.role) as string)
          .subscribe((r) => {
            x.role = r;
            if (idx === array.length - 1) {
              subscriber.next(data);
              subscriber.complete();
            }
          });
      });
    });
  }

  private doEdit() {
    const userInfo = this.getUserInfo();
    if (!this.currentRow) {
      this.showMessage('messages.selectItem');
      return;
    } else if (
      userInfo.role === 'admin' &&
      this.currentRow._id !== userInfo._id
    ) {
      this.showMessage('messages.cannotEditOtherUserInformation')
      return;
    }
    this.router.navigate(['admin/user', this.currentRow._id]);
  }

  private getUserInfo(): User {
    return this.authenticationService.currentUserValue?.user as User;
  }
}
