import { Component, Injector } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Category } from 'src/models/models';
import { FormBase } from 'src/modules/shared/base-classes/form.base';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss'],
})
export class CategoryComponent extends FormBase<Category> {
  entityName = 'category';

  constructor(injector: Injector) {
    super(injector);
  }

  protected getFormGroup(): FormGroup<any> {
    return new FormGroup({
      _id: new FormControl(null, []),
      title: new FormControl(null, [Validators.required]),
      creator: this.getUserGroup(),
      editor: this.getUserGroup(),
    });
  }

  protected virtualAfterSave(): void {
    this.router.navigate(['admin/category-list']);
  }
}
