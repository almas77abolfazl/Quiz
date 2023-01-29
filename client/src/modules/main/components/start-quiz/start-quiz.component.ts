import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QuizService } from '../../services/quiz/quiz.service';

@Component({
  selector: 'app-start-quiz',
  templateUrl: './start-quiz.component.html',
  styleUrls: ['./start-quiz.component.scss'],
})
export class StartQuizComponent implements OnInit {
  levels = this.quizService.levels;
  constructor(private quizService: QuizService, private router: Router) {}

  ngOnInit(): void {}

  goToQuizPage(level: string) {
    this.router.navigate(['/main/quiz-page' , level])
  }
}
