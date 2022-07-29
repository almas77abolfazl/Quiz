import { Component, OnInit } from '@angular/core';
import { User } from 'src/models/models';
import { AdminService } from 'src/services/admin/admin.service';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent implements OnInit {
  columnDefs = [
    { headerName: 'نام کاربری', field: 'username' },
    { headerName: 'ایمیل', field: 'email' },
    { headerName: 'نقش', field: 'role' },
  ];

  rowData: any[] = [];

  loadCompleted = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.users$.subscribe((users: User[]) => {
      users.forEach((user: User) => {
        const row: any = {};
        row.username = user.username;
        row.email = user.email;
        row.role = user.role;

        this.rowData.push(row);
      });
      this.loadCompleted = true;
    });
  }
}
