import { Component, OnInit } from '@angular/core';
import { CellStyle, ColDef } from 'ag-grid-community';
import { map } from 'rxjs/operators';
import { Command, Question, QuestionOption } from 'src/models/models';
import { AdminService } from '../../services/admin/admin.service';

@Component({
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
})
export class QuizListComponent implements OnInit {
  columnDefs: ColDef[] = [
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

  data$ = this.adminService.questions$.pipe(
    map((questions: Question[]) => {
      return this.setStructureOfQuestionRows(questions);
    })
  );

  doRedrawRows = false;

  commands: Command[] = [
    {
      commandName: 'delete',
      label: 'حذف',
    },
  ];

  currentRow: any;

  constructor(private adminService: AdminService) {}

  ngOnInit() {}

  public processCommand(command: Command) {
    if (command.commandName === 'delete') {
      this.adminService.deleteQuestion(this.currentRow).subscribe((res) => {
        if (res) {
          this.doRedrawRows = true;
        }
      });
    }
  }

  public onSelectedRowChange(selectedRows: any) {
    this.currentRow = selectedRows[0];
  }

  private setCellStyles(value: string): CellStyle {
    if (value.endsWith('✅')) {
      return { color: 'white', backgroundColor: '#2aab2a' };
    }
    return {};
  }

  private setStructureOfQuestionRows(questions: Question[]): Question[] {
    const rows: Question[] = [];
    questions.forEach((question: Question) => {
      const row: any = {};
      row._id = question._id;
      row.questionText = question.questionText;
      let index = 1;
      question.options.forEach((option: QuestionOption) => {
        row['option' + index] = option.optionText;
        if (option.isAnswer) {
          row['option' + index] += ' ✅';
        }
        ++index;
      });
      rows.push(row);
    });
    return rows;
  }
}
