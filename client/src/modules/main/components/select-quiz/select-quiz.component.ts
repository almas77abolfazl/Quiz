import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QuizService } from '../../services/quiz/quiz.service';

@Component({
  selector: 'app-select-quiz',
  templateUrl: './select-quiz.component.html',
  styleUrls: ['./select-quiz.component.scss'],
})
export class SelectQuizComponent implements OnInit {
  categories$ = this.quizService.categories$;
  constructor(private quizService: QuizService, private router: Router) {}

  ngOnInit() {}

  goToStartPage() {
    this.router.navigate(['main/start-quiz']);
  }
}
