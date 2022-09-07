import { Component, Injector } from '@angular/core';
import { CellStyle, ColDef } from 'ag-grid-community';
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
      {
        headerName: 'labels.creator',
        field: 'creator.username',
      },
      {
        headerName: 'labels.editor',
        field: 'editor.username',
      },
    ];
    return columns;
  }

  protected getCommands(): Command[] {
    const commands: Command[] = [
      {
        commandName: 'delete',
        label: 'labels.delete',
      },
      {
        commandName: 'edit',
        label: 'labels.edit',
      },
      {
        commandName: 'new',
        label: 'labels.new',
      },
    ];
    return commands;
  }

  protected virtualChangeStructureOfData(questions: Question[]): Question[] {
    const rows: Question[] = [];
    questions.forEach((question: Question) => {
      const row: any = {};
      row._id = question._id;
      row.creator = question.creator;
      row.editor = question.editor;
      row.questionText = question.questionText;
      row.category = question.category;
      row.level = this.translateService.instant('enums.' + question.level);
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
