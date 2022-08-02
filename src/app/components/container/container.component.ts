import { Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'src/models/models';
import { AuthenticationService } from 'src/modules/shared/services/authentication/authentication.service';

@Component({
  selector: 'app-Container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
})
export class ContainerComponent implements OnInit, OnDestroy {
  activeTabNumber = 1;
  loginUrl = '/';

  subscriptions = new Subscription();

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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnInit() {}

  public changeTab(
    activeTab: HTMLElement,
    unActiveTab: HTMLElement,
    activeTabNumber: number
  ): void {
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

  public onLoginSubmit(f: { [key: string]: AbstractControl }): void {
    const sData = { username: f.username.value, password: f.password.value };
    this.subscriptions.add(
      this.authenticationService.login(sData).subscribe((user: User) => {
        this.navigateIntoTheApp(user);
      })
    );
  }

  public onRegisterSubmit(f: { [key: string]: AbstractControl }): void {
    const sData = {
      email: f.email.value,
      username: f.username.value,
      password: f.password.value,
    };
    this.subscriptions.add(
      this.authenticationService.register(sData).subscribe((user: User) => {
        this.navigateIntoTheApp(user);
      })
    );
  }

  private navigateIntoTheApp(user: User): void {
    if (user.role === 'sa' || user.role === 'admin') {
      this.loginUrl = '/admin';
    } else {
      this.loginUrl = '/main';
    }
    this.router.navigate([this.loginUrl]);
  }
}
