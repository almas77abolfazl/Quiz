import { Component } from '@angular/core';
import { Menu } from 'src/models/models';
import { AuthenticationService } from '../shared/services/authentication/authentication.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {
  public menu: Menu[] = [
    {
      displayName: 'labels.userManagement',
      iconName: 'folder',
      children: [
        {
          displayName: 'labels.usersList',
          iconName: 'person',
          route: 'admin/users-list',
        },
      ],
    },
    {
      displayName: 'labels.QuestionManagement',
      iconName: 'folder',
      children: [
        {
          displayName: 'labels.addQuiz',
          iconName: 'description',
          route: 'admin/quiz',
        },
        {
          displayName: 'labels.quizList',
          iconName: 'list',
          route: 'admin/quiz-list',
        },
        {
          displayName: 'labels.category',
          iconName: 'description',
          route: 'admin/category',
        },
        {
          displayName: 'labels.categoryList',
          iconName: 'list',
          route: 'admin/category-list',
        },
      ],
    },
  ];

  public currentUserName = this.getCurrentUserFullName();

  constructor(private authenticationService: AuthenticationService) {}

  public logout(): void {
    this.authenticationService.logout();
  }

  private getCurrentUserFullName(): string {
    const currentUser = this.authenticationService.currentUserValue?.user;
    const firstName = currentUser?.firstName || '';
    const lastName = currentUser?.lastName || '';
    let fullName = firstName + ' ' + lastName;
    if (!fullName || fullName === ' ') {
      fullName = currentUser?.username || '';
    }
    return fullName;
  }
}
