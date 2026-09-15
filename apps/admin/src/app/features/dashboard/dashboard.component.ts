import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly categoryCount = signal<number | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.api.getCategories().subscribe({
      next: (categories) => {
        this.categoryCount.set(categories.length);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('خطا در بارگذاری آمار دسته‌بندی‌ها.');
        this.isLoading.set(false);
      },
    });
  }
}
