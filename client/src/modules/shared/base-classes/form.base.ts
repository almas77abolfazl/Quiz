import { NoopScrollStrategy } from '@angular/cdk/overlay';
import { Component, inject, Injector, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticationService } from '../services/authentication/authentication.service';
import { DialogService } from '../services/dialog/dialog.service';
import { WebRequestService } from '../services/web-request/web-request.service';

@Component({ template: '' })
export abstract class FormBase<T> implements OnInit, OnDestroy {
  readonly subscriptions = new Subscription();

  public formGroup!: FormGroup;
  public isNew = true;

  abstract entityName: string;

  public route: ActivatedRoute;
  public router: Router;
  public webRequestService: WebRequestService;
  public authenticationService: AuthenticationService;
  public dialogService: DialogService;
  public navigatedData: { id: string };

  constructor(injector: Injector) {
    this.route = injector.get(ActivatedRoute);
    this.router = injector.get(Router);
    this.webRequestService = injector.get(WebRequestService);
    this.authenticationService = injector.get(AuthenticationService);
    this.dialogService = injector.get(DialogService);
    this.navigatedData = inject(MAT_DIALOG_DATA);
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
        if (Object.keys(obj[propName]).length === 0) {
          delete obj[propName]; // The object had no properties, so delete that property
        } else {
          this.removeNullProperties(obj[propName]);
          if (Object.keys(obj[propName]).length === 0) {
            delete obj[propName]; // The object had no properties, so delete that property
          }
        }
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
    const validationFromScope = this.validateFormBeforeSave();

    if (validationFromScope && this.validationUserBeforeSave()) {
      const sData = this.removeNullProperties(this.formGroup.value);
      this.subscriptions.add(
        this.webRequestService
          .saveEntity(this.entityName, sData)
          .subscribe((res) => {
            if (res) {
              if (res.body?.message) {
                this.dialogService.showMessage(res.body.message);
              }
              this.virtualAfterSave(res.body);
            }
          })
      );
    }
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

  protected virtualNgOnInit(): void {}

  protected virtualNgOnDestroy(): void {}

  protected validateFormBeforeSave(): boolean {
    return this.formGroup.valid;
  }

  protected virtualAfterSave(entity: T): void {}

  //#endregion

  //#region private methods

  private loadFormOnNavigation(): void {
    const navigatedId =
      this.route.snapshot.paramMap.get('id') || this.navigatedData.id;
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

  private validationUserBeforeSave(): boolean {
    if (this.entityName === 'user') return true;
    const user = this.authenticationService.currentUserValue?.user;
    const userHasFullName = !!user?.firstName && !!user.lastName;
    if (!userHasFullName) {
      this.dialogService.showMessage(
        'messages.pleaseCompleteYourProfileInformation',
        () => {
          import('src/modules/admin/components/user/user.component').then(
            (x) => {
              this.dialogService.showComponent(x.UserComponent, {
                data: {
                  id: this.authenticationService.currentUserValue?.user._id,
                },
                height: '90%',
                width: '500px',
                maxHeight: '500px',
                scrollStrategy: new NoopScrollStrategy(),
              });
            }
          );
        }
      );
    }
    return userHasFullName;
  }

  //#endregion
}
