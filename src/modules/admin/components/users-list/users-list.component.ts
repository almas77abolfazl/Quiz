import { Component, OnInit } from '@angular/core';
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
      commandName: 'save',
      label: 'labels.save',
    },
  ];

  currentRow: any;

  constructor(private adminService: AdminService) {}

  ngOnInit() {}

  processCommand(command: Command) {
    if (command.commandName === 'save') {
      this
    }
  }

  onSelectedRowChange(currentRow: any) {
    this.currentRow = currentRow;
  }
}
