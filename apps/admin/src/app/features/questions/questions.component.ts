import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminApiService, Question } from '../core/services/admin-api.service';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="questions">
      <h2>مدیریت سوالات</h2>
      <table mat-table [dataSource]="dataSource" class="mat-elevation-z8">
        <ng-container matColumnDef="text">
          <th mat-header-cell *matHeaderCellDef>متن سوال</th>
          <td mat-cell *matCellDef="let row">{{row.text | slice:0:50}}</td>
        </ng-container>
        <ng-container matColumnDef="difficulty">
          <th mat-header-cell *matHeaderCellDef>سختی</th>
          <td mat-cell *matCellDef="let row">{{row.difficulty}}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>عملیات</th>
          <td mat-cell *matCellDef="let row">
            <button mat-icon-button (click)="publish(row.id)">
              <mat-icon>publish</mat-icon>
            </button>
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
    .questions {
      padding: 2rem;
    }
    table {
      width: 100%;
      margin-top: 1rem;
    }
  `]
})
export class QuestionsComponent implements OnInit {
  columns = ['text', 'difficulty', 'actions'];
  dataSource = new MatTableDataSource<Question>([]);

  constructor(private readonly api: AdminApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getQuestions().subscribe({
      next: (data) => (this.dataSource.data = data),
      error: () => {},
    });
  }

  publish(id: string) {
    this.api.publishQuestion(id).subscribe(() => this.load());
  }

  delete(id: string) {
    this.api.deleteQuestion(id).subscribe(() => this.load());
  }
}
