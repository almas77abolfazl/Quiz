import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GridComponent } from './components/grid/grid.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { DialogComponent } from './components/dialog/dialog.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AgGridModule,
    TranslateModule,
    MatDialogModule,
    MatSidenavModule,
  ],
  declarations: [
    GridComponent,
    ToolbarComponent,
    DialogComponent,
    SideNavComponent,
  ],
  exports: [
    GridComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ToolbarComponent,
    TranslateModule,
    DialogComponent,
    SideNavComponent
  ],
  providers: [
    { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatDialogRef, useValue: {} },
  ],
})
export class SharedModule {}
