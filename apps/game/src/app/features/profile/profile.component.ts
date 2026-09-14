import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container">
      <h2>پروفایل</h2>
      <div class="profile-card">
        <p><strong>نام کاربری:</strong> {{ user?.username || '---' }}</p>
        <p><strong>نام نمایشی:</strong> {{ user?.displayName || '---' }}</p>
        <p><strong>سکه:</strong> {{ user?.coins }}</p>
        <p><strong>Streak:</strong> {{ user?.dailyStreak }}</p>
      </div>
      <button (click)="logout()">خروج</button>
      <button (click)="back()">بازگشت</button>
    </div>
  `,
  styles: [`
    .profile-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 2rem auto;
    }
    .profile-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: any;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit() {
    this.auth.getCurrentUser().subscribe({
      next: (user) => (this.user = user),
      error: () => this.router.navigate(['/login']),
    });
  }

  logout() {
    this.auth.logout('').subscribe(() => {
      this.auth.setAccessToken(null);
      this.router.navigate(['/login']);
    });
  }

  back() {
    this.router.navigate(['/']);
  }
}
