/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { WebRequestService } from './web-request.service';

describe('Service: WebRequest', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebRequestService]
    });
  });

  it('should ...', inject([WebRequestService], (service: WebRequestService) => {
    expect(service).toBeTruthy();
  }));
});
