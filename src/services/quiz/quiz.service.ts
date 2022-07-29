import { Injectable } from '@angular/core';
import { WebRequestService } from '../web-request/web-request.service';

@Injectable()
export class QuizService {
  constructor(private webRequestService: WebRequestService) {}

  getRandomQuestion() {
    const options = {
      observe: 'response',
    };
    return this.webRequestService.getRandomQuestion(options);
  }
}
