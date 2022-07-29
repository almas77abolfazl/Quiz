/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { QuizService } from './quiz.service';

describe('Service: Quiz', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuizService]
    });
  });

  it('should ...', inject([QuizService], (service: QuizService) => {
    expect(service).toBeTruthy();
  }));
});
