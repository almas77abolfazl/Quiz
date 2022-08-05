import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CellValueChangedEvent, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
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
  @Output() cellValueChanged = new EventEmitter<CellValueChangedEvent>();

  public defaultColDef = {
    flex: 1,
    minWidth: 100,
  };

  public rowSelection: 'single' | 'multiple' = 'single';

  public IsRtl = true;

  public rowData: any[] = [];

  public overlayLoadingTemplate =
    '<span class="ag-overlay-loading-center">در حال بارگزاری...</span>';
  public overlayNoRowsTemplate =
    '<span class="no-rows">هیچ ردیفی وجود ندارد.</span>';

  private gridApi!: GridApi<any>;

  constructor(private translateService: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.doRedrawRows?.currentValue) {
      this.loadData();
    }
  }

  ngOnInit() {
    this.addSelectCheckBox();
    this.columnDefs.forEach((col) => {
      this.translateService.get(col.headerName || '').subscribe((x) => {
        col.headerName = x;
      });
    });
  }

  onSelectionChange(e: any) {
    const selectedRows = this.gridApi.getSelectedRows();
    this.selectedRowChange.emit(selectedRows);
  }

  onGridReady(params: GridReadyEvent<any>) {
    this.gridApi = params.api;
    this.loadData();
  }

  onCellValueChanged(params: CellValueChangedEvent) {
    this.cellValueChanged.emit(params)
  }

  private loadData() {
    this.gridApi.showLoadingOverlay();

    const subscription = this.data$.subscribe((data) => {
      this.gridApi.hideOverlay();
      this.rowData = data;

      subscription.unsubscribe();
    });
  }

  private addSelectCheckBox() {
    if (this.hasCheckboxSelection) {
      this.columnDefs.splice(0, 0, {
        headerName: 'labels.select',
        field: '',
        pinned: 'right',
        lockPinned: true,
        width: 70,
        minWidth: 50,
        flex: 0,
        checkboxSelection: true,
      });
    }
  }
}
