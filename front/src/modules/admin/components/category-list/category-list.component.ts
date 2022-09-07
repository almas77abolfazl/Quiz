import { Component, Injector } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { Category, Command } from 'src/models/models';
import { ListBase } from 'src/modules/shared/base-classes/list.base';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss'],
})
export class CategoryListComponent extends ListBase<Category> {
  entityName = 'category';

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

  protected getColumns(): ColDef<any>[] {
    return [
      { field: 'title', headerName: 'labels.category' },
      { field: 'creator.username', headerName: 'labels.creator' },
      { field: 'editor.username', headerName: 'labels.editor' },
    ];
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

  private doEdit(): void {
    if (this.validateBeforeDoOperationOnCurrentRow()) {
      this.router.navigate(['admin/category', this.currentRow._id]);
    }
  }

  private doDelete(): void {
    if (this.validateBeforeDoOperationOnCurrentRow()) {
      this.deleteEntity(this.currentRow._id);
    }
  }

  private doNew(): void {
    this.router.navigate(['admin/category']);
  }
}
