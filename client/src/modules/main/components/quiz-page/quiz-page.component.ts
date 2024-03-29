import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Question } from 'src/models/models';
import { QuizService } from '../../services/quiz/quiz.service';
import { CustomSocket } from '../../sockets/custom-socket';
import { ToastService } from 'src/modules/shared/services/toast/toast.service';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
  providers: [QuizService, CustomSocket],
})
export class QuizPageComponent implements OnInit, OnDestroy {
  question = {} as Question;

  constructor(
    private quizService: QuizService,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const { level, categoryId } = this.route.snapshot.queryParams;
    this.quizService.level = level;
    this.quizService.categoryId = categoryId;
    this.quizService.createQuiz();
    this.quizService.subscriptions.add(
      this.quizService.listenToMessages().subscribe((res) => {
        this.question = res.question;
        if (res.quizId) {
          this.quizService.quizId = res.quizId;
        }
        if (res.hasOwnProperty('answerWasCorrect')) {
          this.toastService.showToast({
            detail: res.answerWasCorrect
              ? 'آفرین درست بود.'
              : 'متاسفم. امتیازش رو از دست دادی!',
            isSuccess: !!res.answerWasCorrect,
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    if (!this.quizService.subscriptions.closed)
      this.quizService.subscriptions.unsubscribe();
    this.quizService.socket.disconnect();
  }

  public findNextQuestion(lastAnswer: string): void {
    this.quizService.getNextQuestion(this.question._id, lastAnswer);
  }
}
