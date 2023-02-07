import { Injectable, Injector } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Question } from 'src/models/models';
import { CustomSocket } from '../../sockets/custom-socket';
enum Levels {
  'easy',
  'medium',
  'hard',
  'veryHard',
}
@Injectable()
export class QuizService {
  randomId: number[] = [];
  categoryId!: string;
  level!: Levels;
  quizId: string = '';
  socket!: CustomSocket;
  subscriptions = new Subscription();

  constructor(private injector: Injector) {}

  public createQuiz() {
    this.socket = this.injector.get(CustomSocket);
    this.socket.emit('create_quiz', {
      category: this.categoryId,
      level: this.level,
    });
  }

  public listenToMessages(): Observable<NextQuestion> {
    return this.socket.fromEvent('next_question');
  }

  public getNextQuestion(lastQuestionId: string, lastAnswer: string) {
    this.socket.emit('next_question', {
      quizId: this.quizId,
      lastQuestionId,
      lastAnswer,
    });
  }
}

export interface NextQuestion {
  quizId: string;
  question: Question;
  answerWasCorrect?: boolean;
}
