import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GridComponent } from './components/grid/grid.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  MatLegacyDialogModule as MatDialogModule,
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatToolbarModule } from '@angular/material/toolbar';

import { DialogComponent } from './components/dialog/dialog.component';
import { SideNavComponent } from './components/side-nav/side-nav.component';
import { FormComponent } from './components/form/form.component';

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
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatExpansionModule,
    MatButtonModule,
    FlexLayoutModule,
    MatToolbarModule,
  ],
  declarations: [
    GridComponent,
    ToolbarComponent,
    DialogComponent,
    SideNavComponent,
    FormComponent
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
    SideNavComponent,
    MatIconModule,
    MatButtonModule,
    FlexLayoutModule,
    FormComponent
  ],
  providers: [
    { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatDialogRef, useValue: {} },
  ],
})
export class SharedModule {}
