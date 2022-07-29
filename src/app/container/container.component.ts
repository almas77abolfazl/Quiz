import { Component, OnInit, Renderer2 } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { User } from 'src/models/models';
import { AuthenticationService } from 'src/services/authentication/authentication.service';

@Component({
  selector: 'app-Container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
})
export class ContainerComponent implements OnInit {
  loading = false;
  error = '';
  activeTabNumber = 1;
  loginUrl = '/';

  constructor(
    private renderer: Renderer2,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate([this.loginUrl]);
    }
  }

  ngOnInit() {}

  changeTab(
    activeTab: HTMLElement,
    unActiveTab: HTMLElement,
    activeTabNumber: number
  ) {
    if (!activeTab.classList.contains('active')) {
      this.renderer.addClass(activeTab, 'active');
      this.renderer.addClass(unActiveTab, 'inactive');
      this.renderer.addClass(unActiveTab, 'underlineHover');
      this.renderer.removeClass(activeTab, 'inactive');
      this.renderer.removeClass(activeTab, 'underlineHover');
      this.renderer.removeClass(unActiveTab, 'active');
    }
    this.activeTabNumber = activeTabNumber;
  }

  onLoginSubmit(f: { [key: string]: AbstractControl }) {
    this.loading = true;
    this.authenticationService
      .login(f.username.value, f.password.value)
      .pipe(first())
      .subscribe(
        (user: User) => {
          this.navigateIntoTheApp(user);
        },
        (error: string) => {
          this.error = error;
          alert(error);
          this.loading = false;
        }
      );
  }

  onRegisterSubmit(f: { [key: string]: AbstractControl }) {
    this.loading = true;
    const userData = {
      email: f.email.value,
      username: f.username.value,
      password: f.password.value,
    };
    this.authenticationService.register(userData).subscribe(
      (user: User) => {
        this.navigateIntoTheApp(user);
      },
      (error: string) => {
        this.error = error;
        alert(error);
        this.loading = false;
      }
    );
  }

  navigateIntoTheApp(user: User) {
    if (user.role === 'sa' || user.role === 'admin') {
      this.loginUrl = '/admin';
    } else {
      this.loginUrl = '/main';
    }
    this.router.navigate([this.loginUrl]);
  }
}
