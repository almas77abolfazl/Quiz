import { Injectable } from '@angular/core';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';

@Injectable()
export class QuizService {
  categories$ = this.webRequestService.get('category')

  constructor(private webRequestService: WebRequestService) {}

  getRandomQuestion() {
    const options = {
      observe: 'response',
    };
    return this.webRequestService.getRandomQuestion(options);
  }
}
