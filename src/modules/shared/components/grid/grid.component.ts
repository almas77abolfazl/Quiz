import { Component, Input, OnInit } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit {
  @Input() columnDefs: ColDef[] = [];
  @Input() data$: Observable<any> = new Observable();
  @Input() hasCheckboxSelection = false;

  defaultColDef = {
    flex: 1,
    minWidth: 100,
  };

  rowSelection: 'single' | 'multiple' = 'single';

  IsRtl = true;

  rowData: any[] = [];

  loadCompleted = false;

  constructor() {}

  ngOnInit() {
    if (this.hasCheckboxSelection) {
      this.columnDefs.splice(0, 0, {
        headerName: 'انتخاب',
        field: '',
        width: 100,
        flex: 0,
        checkboxSelection: true,
      });
    }
    this.data$.subscribe((data) => {
      this.rowData = data;
      this.loadCompleted = true;
    });
  }
}
