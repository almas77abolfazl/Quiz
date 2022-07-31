import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Question, User } from 'src/models/models';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';

@Injectable()
export class AdminService {
  questions$ = this.webRequestService.get('questions') as Observable<
    Question[]
  >;

  users$ = this.webRequestService.get('users') as Observable<User[]>;

  constructor(private webRequestService: WebRequestService) {}

  addQuestion(question: Question) {
    return this.webRequestService.addQuestion(question).pipe(
      map((result: any) => {
        const question = result.body;
        return question;
      })
    );
  }

  deleteQuestion(question: Question) {
    return this.webRequestService.deleteQuestion(question)
  }
}
