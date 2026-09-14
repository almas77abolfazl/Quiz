import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService, Question } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="questions">
      <h2>مدیریت سوالات</h2>
      <table>
        <thead>
          <tr><th>متن سوال</th><th>سختی</th><th>عملیات</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of data">
            <td>{{row.text | slice:0:50}}</td>
            <td>{{row.difficulty}}</td>
            <td>
              <button (click)="publish(row.id)">انتشار</button>
              <button (click)="delete(row.id)">حذف</button>
            </td>
          </tr>
        </tbody>
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
      border-collapse: collapse;
    }
    th, td {
      padding: 0.5rem;
      text-align: right;
      border-bottom: 1px solid #eee;
    }
  `]
})
export class QuestionsComponent implements OnInit {
  data: Question[] = [];

  constructor(private readonly api: AdminApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getQuestions().subscribe({
      next: (data) => (this.data = data),
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
