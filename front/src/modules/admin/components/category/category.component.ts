import { Component, Injector, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
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
      categoryTitle: new FormControl(null, []),
    });
  }


}
