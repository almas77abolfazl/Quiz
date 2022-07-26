import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { Question } from 'src/models/models';
import { WebRequestService } from '../web-request/web-request.service';

@Injectable()
export class AdminService {
  constructor(private webRequestService: WebRequestService) {}

  addQuestion(question: Question) {
    return this.webRequestService.addQuestion(question).pipe(
      map((result: any) => {
        const question = result.body;
        return question;
      })
    );
  }
}
