import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Category } from 'src/models/models';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';
enum Levels {
  'easy',
  'medium',
  'hard',
  'veryHard',
}
@Injectable()
export class QuizService {
  categories$ = this.webRequestService.get('category');
  levels = ['easy', 'medium', 'hard', 'veryHard'];
  currentCategory!: Category;
  currentLevel!: Levels;

  constructor(
    private webRequestService: WebRequestService,
    private socket: Socket
  ) {}

  createQuiz() {
    this.socket.emit('create_quiz', {
      category: this.currentCategory,
      level: this.currentLevel,
    });
  }

  getQuestion() {
    const options = {
      observe: 'response',
    };
    return this.webRequestService.get(
      `question/getQuestion/${this.currentLevel}/${this.currentCategory._id}`
    );
  }
}
