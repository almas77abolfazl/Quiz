import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AdminApiService, Category } from '../core/services/admin-api.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="categories">
      <h2>مدیریت دسته‌ها</h2>
      <button mat-raised-button color="primary" (click)="openDialog()">افزودن دسته</button>
      <table mat-table [dataSource]="dataSource" class="mat-elevation-z8">
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>عنوان</th>
          <td mat-cell *matCellDef="let row">{{row.title}}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>عملیات</th>
          <td mat-cell *matCellDef="let row">
            <button mat-icon-button color="warn" (click)="delete(row.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
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
    }
  `]
})
export class CategoriesComponent implements OnInit {
  columns = ['title', 'actions'];
  dataSource = new MatTableDataSource<Category>([]);
  form: FormGroup;

  constructor(private readonly api: AdminApiService, private readonly fb: FormBuilder, private readonly dialog: MatDialog) {
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
      next: (data) => (this.dataSource.data = data),
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
