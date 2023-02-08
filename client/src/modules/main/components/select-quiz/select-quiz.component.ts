import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Category } from 'src/models/models';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';

@Component({
  selector: 'app-select-quiz',
  templateUrl: './select-quiz.component.html',
  styleUrls: ['./select-quiz.component.scss'],
})
export class SelectQuizComponent implements OnInit {
  categories$ = this.webRequestService.get('category');

  constructor(
    private webRequestService: WebRequestService,
    private router: Router
  ) {}

  ngOnInit() {}

  goToStartPage(category: Category) {
    this.router.navigate(['main/start-quiz'], {
      queryParams: { categoryId: category._id },
    });
  }
}
