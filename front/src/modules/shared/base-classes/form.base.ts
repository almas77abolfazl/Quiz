import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DialogComponent } from '../components/dialog/dialog.component';
import { WebRequestService } from '../services/web-request/web-request.service';

@Component({ template: '' })
export abstract class FormBase<T> implements OnInit, OnDestroy {
  readonly subscriptions = new Subscription();

  public formGroup!: FormGroup;
  public isNew = true;

  abstract entityName: string;

  public webRequestService: WebRequestService;
  public dialog: MatDialog;
  public router: Router;
  public route: ActivatedRoute;

  constructor(injector: Injector) {
    this.route = injector.get(ActivatedRoute);
    this.webRequestService = injector.get(WebRequestService);
    this.dialog = injector.get(MatDialog);
    this.router = injector.get(Router);
  }

  public removeNullProperties(obj: any): any {
    for (const propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined) {
        delete obj[propName];
      } else if (obj[propName].constructor === Array) {
        obj[propName].forEach((obj2: any) => {
          this.removeNullProperties(obj2);
        });
      } else if (typeof obj[propName] === 'object') {
        this.removeNullProperties(obj[propName]);
      }
    }
    return obj;
  }

  public onFieldValueChanges(
    fieldName: string,
    callBack: (newValue: any) => {}
  ): void {
    const control = this.formGroup.get(fieldName);
    this.subscriptions.add(
      control?.valueChanges.subscribe((newValue) => {
        callBack(newValue);
      })
    );
  }

  public getSubControl(fieldName: string): AbstractControl {
    return this.formGroup.get(fieldName) as AbstractControl;
  }

  public getSubFormGroup(fieldName: string): FormGroup {
    return this.formGroup.get(fieldName) as FormGroup;
  }

  public getFromArray(fieldName: string): FormArray {
    return this.formGroup.get(fieldName) as FormArray;
  }

  public save(): void {
    const canSave = this.validateFormBeforeSave();
    if (canSave) {
      const sData = this.removeNullProperties(this.formGroup.value);
      this.subscriptions.add(
        this.webRequestService
          .saveEntity(this.entityName, this.removeNullProperties(sData))
          .subscribe((res) => {
            if (res) {
              this.virtualAfterSave();
            }
          })
      );
    }
  }

  public showMessage(message: string) {
    this.dialog.open(DialogComponent, {
      data: {
        message: message,
        buttons: ['ok'],
      },
    });
  }

  //#region lifeCycle hooks

  ngOnInit(): void {
    this.formGroup = this.getFormGroup();
    this.virtualNgOnInit();
    this.loadFormOnNavigation();
  }

  ngOnDestroy(): void {
    this.virtualNgOnDestroy();
    this.subscriptions.unsubscribe();
  }

  //#endregion

  //#region abstract methods

  protected abstract getFormGroup(): FormGroup;

  //#endregion

  //#region protected methods

  protected virtualNgOnInit() {}

  protected virtualNgOnDestroy() {}

  protected validateFormBeforeSave(): boolean {
    return this.formGroup.valid;
  }

  protected virtualAfterSave() {}

  //#endregion

  //#region private methods

  private loadFormOnNavigation(): void {
    const navigatedId = this.route.snapshot.paramMap.get('id');
    if (navigatedId) {
      this.isNew = false;
      this.subscriptions.add(
        this.webRequestService
          ?.getEntity(this.entityName, navigatedId)
          .subscribe((res) => {
            if (res) {
              this.setFormValue(res);
            }
          })
      );
    }
  }

  private setFormValue(res: any): void {
    for (const key in res) {
      if (Object.prototype.hasOwnProperty.call(res, key)) {
        const value = res[key];
        const formControl = this.formGroup.get(key);
        if (formControl) {
          formControl.setValue(value);
        }
      }
    }
  }
  //#endregion
}
