import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminApiService, Category } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="categories">
      <h2>مدیریت دستهها</h2>
      <button (click)="openDialog()">افزودن دسته</button>
      <table>
        <thead>
          <tr><th>عنوان</th><th>عملیات</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of data">
            <td>{{row.title}}</td>
            <td><button (click)="delete(row.id)">حذف</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .categories {
      padding: 2rem;
    }
    table {
      width: 100%;
      margin-top: 1rem;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.5rem;
      text-align: right;
      border-bottom: 1px solid #eee;
    }
  `]
})
export class CategoriesComponent implements OnInit {
  data: Category[] = [];
  form: FormGroup;

  constructor(private readonly api: AdminApiService, private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      title: [''],
      description: [''],
      coverKey: [''],
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getCategories().subscribe({
      next: (data) => (this.data = data),
      error: () => {},
    });
  }

  openDialog() {
    // Dialog implementation would go here
  }

  delete(id: string) {
    this.api.deleteCategory(id).subscribe(() => this.load());
  }
}
