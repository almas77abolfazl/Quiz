import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from 'src/modules/shared/services/authentication/authentication.service';
import { WebRequestService } from 'src/modules/shared/services/web-request/web-request.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  constructor(
    public authenticationService: AuthenticationService,
    private webRequestService: WebRequestService
  ) {}

  ngOnInit() {
    this.getAllUserQuizzes();
  }

  getAllUserQuizzes() {
    this.webRequestService.get('quiz')
  }
}
