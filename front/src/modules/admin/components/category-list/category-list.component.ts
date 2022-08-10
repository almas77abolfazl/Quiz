import { Component, Injector, OnInit } from '@angular/core';
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

  processCommand(command: Command) {
    switch (command.commandName) {
      case 'delete':
        break;
      case 'edit':
        break;
      case 'new':
        break;
    }
  }

  protected getColumns(): ColDef<any>[] {
    return [{ field: 'title', headerName: 'labels.category' }];
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
}
