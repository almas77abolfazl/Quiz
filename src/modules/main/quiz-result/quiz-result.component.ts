import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserAnswers } from 'src/models/models';

@Component({
  selector: 'app-quiz-result',
  templateUrl: './quiz-result.component.html',
  styleUrls: ['./quiz-result.component.scss'],
})
export class QuizResultComponent implements OnInit {
  userAnswers: UserAnswers[] = [];
  userPoint = 0;
  constructor(private route: ActivatedRoute, private router: Router) {
    const dataAfterNavigate =
      this.router?.getCurrentNavigation()?.extras?.state;
    if (dataAfterNavigate) {
      this.userAnswers = dataAfterNavigate.userAnswers;
    }
  }

  ngOnInit(): void {
    this.userAnswers.forEach((x) => {
      if (x.question.answerId === x.userAnswerId) {
        this.userPoint += 2;
      }
    });
  }
}
