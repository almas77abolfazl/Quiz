import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';

import { Command, User } from 'src/models/models';
import { ListBase } from 'src/modules/shared/base-classes/list.base';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent extends ListBase<User> {
  entityName = 'users';

  constructor(webReq: WebRequestService, private router: Router) {
    super(webReq);
  }

  public processCommand(command: Command) {
    if (command.commandName === 'edit') {
      if (!this.currentRow) {
        alert('messages.selectItem');
        return;
      }
      this.router.navigate(['admin/user', this.currentRow._id]);
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
}
