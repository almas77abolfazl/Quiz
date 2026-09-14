import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <div class="profile-container">
      <h2>پروفایل</h2>
      <mat-card>
        <mat-card-content>
          <p><strong>نام کاربری:</strong> {{ user?.username || '---' }}</p>
          <p><strong>نام نمایشی:</strong> {{ user?.displayName || '---' }}</p>
          <p><strong>سکه:</strong> {{ user?.coins }}</p>
          <p><strong>Streak:</strong> {{ user?.dailyStreak }}</p>
        </mat-card-content>
      </mat-card>
      <button mat-raised-button color="warn" (click)="logout()">خروج</button>
      <button mat-button (click)="back()">بازگشت</button>
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
