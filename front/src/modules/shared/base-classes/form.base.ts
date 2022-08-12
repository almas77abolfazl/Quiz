import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
} from '@angular/forms';
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

  public webRequestService: WebRequestService;
  public router: Router;
  public route: ActivatedRoute;
  public dialogService: DialogService;
  public authenticationService: AuthenticationService;

  constructor(injector: Injector) {
    this.route = injector.get(ActivatedRoute);
    this.webRequestService = injector.get(WebRequestService);
    this.router = injector.get(Router);
    this.dialogService = injector.get(DialogService);
    this.authenticationService = injector.get(AuthenticationService);
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
    const canSave = this.validateFormBeforeSave();
    if (canSave) {
      const sData = this.removeNullProperties(this.formGroup.value);
      if (!sData.creator) {
        sData.creator = this.authenticationService.currentUserValue?.user;
      } else {
        sData.editor = this.authenticationService.currentUserValue?.user;
      }
      this.subscriptions.add(
        this.webRequestService
          .saveEntity(this.entityName, sData)
          .subscribe((res) => {
            if (res) {
              if (res.body?.message) {
                this.dialogService.showMessage(res.body.message);
              }
              this.virtualAfterSave();
            }
          })
      );
    }
  }

  public getUserGroup() {
    return new FormGroup({
      _id: new FormControl(null, []),
      __v: new FormControl(null, []),
      createdAt: new FormControl(null, []),
      updatedAt: new FormControl(null, []),
      username: new FormControl(null, []),
      email: new FormControl(null, []),
      role: new FormControl(null, []),
      password: new FormControl(null, []),
      firstName: new FormControl(null, []),
      lastName: new FormControl(null, []),
      gender: new FormControl(null, []),
      sessions: new FormControl(null, []),
      address: new FormControl(null, []),
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
