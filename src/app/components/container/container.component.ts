import { Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { User } from 'src/models/models';
import { AuthenticationService } from 'src/modules/shared/services/authentication/authentication.service';

@Component({
  selector: 'app-Container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
})
export class ContainerComponent implements OnInit, OnDestroy {
  private _loading = false;

  get loading() {
    return this._loading;
  }

  set loading(value) {
    this._loading = value;
    if (value) {
      this.spinner.show();
    } else {
      this.spinner.hide();
    }
  }

  activeTabNumber = 1;
  loginUrl = '/';

  subscriptions = new Subscription();

  constructor(
    private renderer: Renderer2,
    private router: Router,
    private authenticationService: AuthenticationService,
    private spinner: NgxSpinnerService
  ) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate([this.loginUrl]);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnInit() {}

  public changeTab(
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

  public onLoginSubmit(f: { [key: string]: AbstractControl }) {
    this.loading = true;
    this.subscriptions.add(
      this.authenticationService
        .login(f.username.value, f.password.value)
        .pipe(first())
        .subscribe(
          (user: User) => {
            this.navigateIntoTheApp(user);
            this.loading = false;
          },
          (error: string) => {
            alert(error);
            this.loading = false;
          }
        )
    );
  }

  public onRegisterSubmit(f: { [key: string]: AbstractControl }) {
    this.loading = true;
    const userData = {
      email: f.email.value,
      username: f.username.value,
      password: f.password.value,
    };
    this.subscriptions.add(
      this.authenticationService.register(userData).subscribe(
        (user: User) => {
          this.navigateIntoTheApp(user);
          this.loading = false;
        },
        (error: string) => {
          alert(error);
          this.loading = false;
        }
      )
    );
  }

  private navigateIntoTheApp(user: User) {
    if (user.role === 'sa' || user.role === 'admin') {
      this.loginUrl = '/admin';
    } else {
      this.loginUrl = '/main';
    }
    this.router.navigate([this.loginUrl]);
  }
}
