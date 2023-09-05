import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../shared/services/authentication/authentication.service';
import { DialogService } from '../shared/services/dialog/dialog.service';
import { ProfileComponent } from './components/profile/profile.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {
  constructor(
    public authenticationService: AuthenticationService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {}

  logout() {
    this.authenticationService.logout();
    this.router.navigateByUrl('login');
  }

  goToAdminPage() {
    this.router.navigate(['/admin']);
  }

  onUserNameClick() {
    this.dialogService.showComponent(ProfileComponent, {
      width: '200px',
      height: '80%',
    });
  }
}
