import { Component, Injector } from '@angular/core';
import { CellStyle, ColDef } from 'ag-grid-community';
import { Observable } from 'rxjs';
import { Command, Question, QuestionOption } from 'src/models/models';
import { ListBase } from 'src/modules/shared/base-classes/list.base';

@Component({
  selector: 'app-quiz-list',
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
})
export class QuizListComponent extends ListBase<Question> {
  entityName = 'questions';

  constructor(injector: Injector) {
    super(injector);
  }

  public processCommand(command: Command) {
    switch (command.commandName) {
      case 'delete':
        this.doDelete();
        break;
      case 'edit':
        this.doEdit();
        break;
      case 'new':
        this.doNew();
        break;
    }
  }

  protected getColumns(): ColDef[] {
    const columns = [
      {
        headerName: 'labels.category',
        field: 'category.title',
        flex: 1,
      },
      {
        headerName: 'labels.level',
        field: 'level',
        flex: 1,
      },
      {
        headerName: 'labels.questionText',
        field: 'questionText',
        cellStyle: { color: 'black', backgroundColor: '#b6b0b0' },
        width: 300,
      },
      {
        headerName: 'labels.firstOption',
        field: 'option1',
        cellStyle: (params: any) => this.setCellStyles(params.value),
      },
      {
        headerName: 'labels.secondOption',
        field: 'option2',
        cellStyle: (params: any) => this.setCellStyles(params.value),
      },
      {
        headerName: 'labels.thirdOption',
        field: 'option3',
        cellStyle: (params: any) => this.setCellStyles(params.value),
      },
      {
        headerName: 'labels.fourthOption',
        field: 'option4',
        cellStyle: (params: any) => this.setCellStyles(params.value),
      },
    ];
    return columns;
  }

  protected getCommands(): Command[] {
    const commands: Command[] = [
      {
        commandName: 'new',
        label: 'labels.new',
      },
      {
        commandName: 'edit',
        label: 'labels.edit',
      },
      {
        commandName: 'delete',
        label: 'labels.delete',
      },
    ];
    return commands;
  }

  protected virtualChangeStructureOfData(questions: Question[]): Question[] {
    const rows: Question[] = [];
    questions.forEach((question: Question) => {
      const row: any = {};
      row._id = question._id;
      row.questionText = question.questionText;
      row.category = question.category;
      row.level = question.level;
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

  protected virtualChangeStructureOfDataAsync(
    data: Question[]
  ): Observable<Question[]> {
    return new Observable((subscriber) => {
      data.forEach((x, idx, array) => {
        this.translateService
          .get(('enums.' + x.level) as string)
          .subscribe((level) => {
            x.level = level;
            if (idx === array.length - 1) {
              subscriber.next(data);
              subscriber.complete();
            }
          });
      });
    });
  }

  private setCellStyles(value: string): CellStyle {
    if (value.endsWith('✅')) {
      return { color: 'white', backgroundColor: '#2aab2a' };
    }
    return {};
  }

  private doEdit(): void {
    if (this.validateBeforeDoOperationOnCurrentRow()) {
      this.router.navigate(['admin/quiz', this.currentRow._id]);
    }
  }

  private doDelete(): void {
    if (this.validateBeforeDoOperationOnCurrentRow()) {
      this.deleteEntity(this.currentRow._id);
    }
  }

  private doNew(): void {
    this.router.navigate(['admin/quiz']);
  }
}
