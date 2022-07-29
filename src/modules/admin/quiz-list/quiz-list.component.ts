import { Component, OnInit } from '@angular/core';
import { Question, QuestionOption } from 'src/models/models';
import { AdminService } from 'src/services/admin/admin.service';

@Component({
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
})
export class QuizListComponent implements OnInit {
  setCellStyles(value: string) {
    if (value.endsWith('✅')) {
      //mark police cells as red
      return { color: 'white', backgroundColor: '#2aab2a' };
    }
    return null;
  }
  columnDefs = [
    {
      headerName: 'سوال',
      field: 'questionText',
      cellStyle: { color: 'black', backgroundColor: '#b6b0b0' },
      width: 300,
    },
    {
      headerName: 'گزینه اول',
      field: 'option1',
      cellStyle: (params: any) => this.setCellStyles(params.value),
    },
    {
      headerName: 'گزینه دوم',
      field: 'option2',
      cellStyle: (params: any) => this.setCellStyles(params.value),
    },
    {
      headerName: 'گزینه سوم',
      field: 'option3',
      cellStyle: (params: any) => this.setCellStyles(params.value),
    },
    {
      headerName: 'گزینه چهارم',
      field: 'option4',
      cellStyle: (params: any) => this.setCellStyles(params.value),
    },
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
          if (option.isAnswer) {
            row['option' + index] += '✅';
          }
          ++index;
        });
        this.rowData.push(row);
      });
      this.loadCompleted = true;
    });
  }
}
