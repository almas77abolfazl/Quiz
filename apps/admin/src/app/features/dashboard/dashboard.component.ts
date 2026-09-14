import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminApiService, Category } from '../core/services/admin-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dashboard">
      <h2>داشبورد مدیریت</h2>
      <div class="stats">
        <div class="stat-card">
          <h3>دسته‌ها</h3>
          <p>{{ categories.length }}</p>
        </div>
      </div>
      <div class="actions">
        <button mat-raised-button color="primary" routerLink="/categories">مدیریت دسته‌ها</button>
        <button mat-raised-button color="accent" routerLink="/questions">مدیریت سوالات</button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 2rem;
    }
    .stats {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
      min-width: 150px;
    }
    .actions {
      display: flex;
      gap: 1rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  categories: Category[] = [];

  constructor(private readonly api: AdminApiService) {}

  ngOnInit() {
    this.api.getCategories().subscribe({
      next: (data) => (this.categories = data),
      error: () => {},
    });
  }
}
