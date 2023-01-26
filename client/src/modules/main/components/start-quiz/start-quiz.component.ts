import { Component, OnInit } from '@angular/core';
import { QuizService } from '../../services/quiz/quiz.service';

@Component({
  selector: 'app-start-quiz',
  templateUrl: './start-quiz.component.html',
  styleUrls: ['./start-quiz.component.scss'],
})
export class StartQuizComponent implements OnInit {
  levels$ = this.quizService.levels$;
  constructor(private quizService: QuizService) {}

  ngOnInit(): void {}
}
