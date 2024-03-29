import {
  AfterViewInit,
  Component,
  Injector,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Observable, of, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Command } from 'src/models/models';
import { AuthenticationService } from '../services/authentication/authentication.service';
import { DialogService } from '../services/dialog/dialog.service';
import { WebRequestService } from '../services/web-request/web-request.service';

@Component({ template: '' })
export abstract class ListBase<T> implements OnInit, OnDestroy, AfterViewInit {
  readonly subscriptions = new Subscription();

  public columnDefs: ColDef[] = [];

  public rowData: T[] = [];

  public commands: Command[] = [];

  public currentRow: any;

  public gridApi!: GridApi<any>;

  abstract entityName: string;

  public webRequestService: WebRequestService;
  public translateService: TranslateService;
  public router: Router;
  public dialogService: DialogService;
  public authenticationService: AuthenticationService;

  constructor(injector: Injector) {
    this.webRequestService = injector.get(WebRequestService);
    this.translateService = injector.get(TranslateService);
    this.router = injector.get(Router);
    this.dialogService = injector.get(DialogService);
    this.authenticationService = injector.get(AuthenticationService);
  }

  //#region public

  public onSelectedRowChange(selectedRows: any) {
    this.currentRow = selectedRows[0];
  }

  public onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  public deleteEntity(id: string) {
    this.gridApi.showLoadingOverlay();
    return this.webRequestService
      .delete(`${this.entityName}/${id}`)
      .subscribe((res) => {
        if (res) {
          if (res.message) {
            this.dialogService.showMessage(res.message);
          }
          this.getData();
          this.gridApi.hideOverlay();
          this.currentRow = null;
        }
      });
  }

  public validateBeforeDoOperationOnCurrentRow(): boolean {
    if (!this.currentRow) {
      this.dialogService.showMessage('messages.selectItem');
      return false;
    }
    return true;
  }

  //#endregion

  //#region lifeCycle hooks

  ngOnInit(): void {
    this.getData();
    this.columnDefs = this.getColumns();
    this.commands = this.getCommands();
    this.virtualNgOnInit();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.virtualNgOnDestroy();
    this.subscriptions.unsubscribe();
  }

  //#endregion

  //#region abstract methods

  protected abstract getColumns(): ColDef[];

  protected abstract getCommands(): Command[];

  //#endregion

  //#region protected methods

  protected virtualNgOnInit() {}

  protected virtualNgOnDestroy() {}

  protected virtualChangeStructureOfData(data: T[]): T[] {
    return data;
  }

  protected virtualChangeStructureOfDataAsync(data: T[]): Observable<T[]> {
    return of(data);
  }

  //#endregion

  //#region private methods

  private getData() {
    this.gridApi?.showLoadingOverlay();
    this.webRequestService
      .get(this.entityName)
      .pipe(
        switchMap((res: T[]) => {
          return this.virtualChangeStructureOfDataAsync(res);
        }),
        map((res: T[]) => {
          return this.virtualChangeStructureOfData(res);
        })
      )
      .subscribe((res) => {
        this.rowData = res;
        this.gridApi?.hideOverlay();
      });
  }
  //#endregion
}
