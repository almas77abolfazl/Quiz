import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Question } from 'src/models/models';
import { QuizService } from '../../services/quiz/quiz.service';

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.scss'],
})
export class QuizPageComponent implements OnInit, OnDestroy {
  question = {} as Question;
  randomId: number[] = [];

  subscriptions = new Subscription();

  constructor(
    private quizService: QuizService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.quizService.currentLevel = this.route.snapshot.params.level;
    this.findNextQuestion();
  }

  ngOnDestroy(): void {
    if (!this.subscriptions.closed) this.subscriptions.unsubscribe();
  }

  public findNextQuestion(): void {
    this.subscriptions.add(
      this.quizService.getQuestion().subscribe((res: any) => {
        this.question = res;
      })
    );
  }
}
