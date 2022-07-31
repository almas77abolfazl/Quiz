import { Component, OnInit } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { Command } from 'src/models/models';
import { AdminService } from '../../services/admin/admin.service';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent implements OnInit {
  columnDefs: ColDef[] = [
    { headerName: 'نام کاربری', field: 'username' },
    { headerName: 'ایمیل', field: 'email' },
    { headerName: 'نقش', field: 'role' },
  ];

  data$ = this.adminService.users$;

  commands: Command[] = [
    {
      commandName: 'delete',
      label: 'حذف',
    },
  ];

  currentRow: any;

  constructor(private adminService: AdminService) {}

  ngOnInit() {}

  processCommand(command: Command) {
    if (command.commandName === 'delete') {
    }
  }

  onSelectedRowChange(currentRow: any) {
    this.currentRow = currentRow;
  }
}
