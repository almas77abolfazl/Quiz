import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit, OnChanges {
  @Input() columnDefs: ColDef[] = [];
  @Input() data$: Observable<any> = new Observable();
  @Input() hasCheckboxSelection = false;
  @Input() doRedrawRows = false;
  @Output() selectedRowChange = new EventEmitter<any[]>();

  private gridApi!: GridApi<any>;

  defaultColDef = {
    flex: 1,
    minWidth: 100,
  };

  rowSelection: 'single' | 'multiple' = 'single';

  IsRtl = true;

  rowData: any[] = [];

  loadCompleted = false;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.doRedrawRows?.currentValue) {
      this.redrawRows();
    }
  }

  ngOnInit() {
    this.addSelectCheckBox();
    this.loadData();
  }

  onSelectionChange(e: any) {
    const selectedRows = this.gridApi.getSelectedRows();
    this.selectedRowChange.emit(selectedRows);
  }

  onGridReady(params: GridReadyEvent<any>) {
    this.gridApi = params.api;
  }

  redrawRows() {
    this.loadData();
  }

  private loadData() {
    const subscription = this.data$.subscribe((data) => {
      this.rowData = data;
      this.loadCompleted = true;
      subscription.unsubscribe();
    });
  }

  private addSelectCheckBox() {
    if (this.hasCheckboxSelection) {
      this.columnDefs.splice(0, 0, {
        headerName: 'انتخاب',
        field: '',
        width: 100,
        flex: 0,
        checkboxSelection: true,
      });
    }
  }
}
