import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { UserAnswers } from 'src/models/models';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';

@Component({
  selector: 'app-quiz-result',
  templateUrl: './quiz-result.component.html',
  styleUrls: ['./quiz-result.component.scss'],
})
export class QuizResultComponent implements OnInit {
  quizId!: string;
  quizResult: { result: any[]; score: number } = { result: [], score: 0 };
  constructor(
    private router: Router,
    private webRequestService: WebRequestService
  ) {
    const dataAfterNavigate =
      this.router?.getCurrentNavigation()?.extras?.state;
    if (dataAfterNavigate) {
      this.quizId = dataAfterNavigate.quizId;
    }
  }

  ngOnInit(): void {
    this.getQuizResult();
  }

  private getQuizResult(): void {
    this.webRequestService
      .get(`quiz/getQuizResult/${this.quizId}`)
      .pipe(take(1))
      .subscribe((res) => {
        this.quizResult = res;
      });
  }
}
