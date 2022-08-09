import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../shared/services/authentication/authentication.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  public currentUserName = this.getCurrentUserFullName();

  constructor(private authenticationService: AuthenticationService) {}

  ngOnInit() {}

  logout() {
    this.authenticationService.logout();
  }

  private getCurrentUserFullName(): string {
    const currentUser = this.authenticationService.currentUserValue?.user;
    const firstName = currentUser?.firstName || '';
    const lastName = currentUser?.lastName || '';
    let fullName = firstName + ' ' + lastName;
    if (!fullName) {
      fullName = currentUser?.username || '';
    }
    return fullName;
  }
}
