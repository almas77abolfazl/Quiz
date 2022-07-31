import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../shared/services/authentication/authentication.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  constructor(private authenticationService: AuthenticationService) {}

  ngOnInit() {}

  logout() {
    this.authenticationService.logout();
  }
}
