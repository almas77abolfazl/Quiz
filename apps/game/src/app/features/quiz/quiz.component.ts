import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Category } from '../../core/services/api.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quiz-container">
      <h2>بازی تک نفره</h2>
      <label>دستهبندی</label>
      <select [(ngModel)]="categoryId">
        <option value="">همه</option>
        <option *ngFor="let cat of categories" [value]="cat.id">{{cat.title}}</option>
      </select>
      <button (click)="start()" [disabled]="loading">شروع بازی</button>
      <button (click)="back()">بازگشت</button>
    </div>
  `,
  styles: [`
    .quiz-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 2rem auto;
    }
  `]
})
export class QuizComponent implements OnInit {
  categories: Category[] = [];
  categoryId = '';
  loading = false;

  constructor(private readonly router: Router, private readonly api: ApiService) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (data) => (this.categories = data),
      error: () => {},
    });
  }

  start() {
    this.loading = true;
    this.api.startQuiz(this.categoryId || undefined).subscribe({
      next: () => this.router.navigate(['/quiz/play']),
      error: () => (this.loading = false),
    });
  }

  back() {
    this.router.navigate(['/']);
  }
}
