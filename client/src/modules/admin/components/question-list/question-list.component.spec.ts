/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { QuizListComponent } from './question-list.component';

describe('QuizListComponent', () => {
  let component: QuizListComponent;
  let fixture: ComponentFixture<QuizListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ QuizListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuizListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
