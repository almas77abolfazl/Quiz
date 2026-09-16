import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { UserRole } from '@quiz/contracts';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isStaff = this.authService.isStaff;
  readonly user = this.authService.user;
  readonly userRole = this.authService.userRole;
  readonly canAccessContent = computed(() => {
    const role = this.userRole();
    return role === UserRole.ROOT_ADMIN || role === UserRole.CONTENT_SPECIALIST;
  });

  ngOnInit(): void {
    if (!this.authService.isInitialized()) {
      this.authService.restoreSession().subscribe();
    }
  }

  onLogout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
