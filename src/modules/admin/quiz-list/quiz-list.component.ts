import { Component, OnInit } from '@angular/core';
import { Question, QuestionOption } from 'src/models/models';
import { AdminService } from 'src/services/admin/admin.service';

@Component({
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  providers: [AdminService],
})
export class QuizListComponent implements OnInit {
  columnDefs = [
    { headerName: 'سوال', field: 'questionText' },
    { headerName: 'گزینه اول', field: 'option1' },
    { headerName: 'گزینه دوم', field: 'option2' },
    { headerName: 'گزینه سوم', field: 'option3' },
    { headerName: 'گزینه چهارم', field: 'option4' },
  ];

  rowData: any[] = [];

  loadCompleted = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.adminService.questions$.subscribe((questions: Question[]) => {
      questions.forEach((question: Question) => {
        const row: any = {};
        row.questionText = question.questionText;
        let index = 1;
        question.options.forEach((option: QuestionOption) => {
          row['option' + index] = option.optionText;
          ++index;
        });
        this.rowData.push(row);
      });
      this.loadCompleted = true;
    });
  }
}
