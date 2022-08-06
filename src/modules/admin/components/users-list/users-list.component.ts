import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';

import { Command } from 'src/models/models';
import { GridSelectEditorComponent } from 'src/modules/shared/components/grid-select-editor/grid-select-editor.component';
import { AdminService } from '../../services/admin/admin.service';

const roles = ['normal', 'admin'];

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent implements OnInit {
  canEditRole = true;

  columnDefs: ColDef[] = [
    { headerName: 'labels.username', field: 'username' },
    { headerName: 'labels.email', field: 'email' },
    {
      headerName: 'labels.role',
      field: 'role',
      cellRenderer: GridSelectEditorComponent,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: roles,
      },
      editable: (params) => {
        if (params.data.role === 'sa') {
          return false;
        } else if (this.canEditRole) {
          return true;
        } else return false;
      },
    },
  ];

  data$ = this.adminService.users$;

  commands: Command[] = [
    {
      commandName: 'edit',
      label: 'labels.edit',
    },
  ];

  currentRow: any;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit() {}

  processCommand(command: Command) {
    if (command.commandName === 'edit') {
      if (!this.currentRow) {
        alert('messages.selectItem');
        return;
      }
      this.router.navigate(['admin/user', this.currentRow._id]);
      // alert('این قسمت هنوز کامل نشده است')
    }
  }

  onSelectedRowChange(selectedRows: any) {
    this.currentRow = selectedRows[0];
  }
}
