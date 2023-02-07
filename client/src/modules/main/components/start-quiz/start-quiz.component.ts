import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-start-quiz',
  templateUrl: './start-quiz.component.html',
  styleUrls: ['./start-quiz.component.scss'],
})
export class StartQuizComponent implements OnInit {
  levels = ['easy', 'medium', 'hard', 'veryHard'];
  categoryId!: string;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.queryParams.categoryId;
  }

  goToQuizPage(level: string) {
    this.router.navigate(['/main/quiz-page'], {
      queryParams: {
        level,
        categoryId: this.categoryId,
      },
    });
  }
}
