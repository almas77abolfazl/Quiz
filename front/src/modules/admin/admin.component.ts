import { Component, OnInit } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { Menu } from 'src/models/models';
import { AuthenticationService } from '../shared/services/authentication/authentication.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  public menu: Menu[] = [
    {
      displayName: 'labels.userManagement',
      iconName: '',
      children: [
        {
          displayName: 'labels.usersList',
          iconName: '',
          route: 'admin/users-list',
        },
      ],
    },
    {
      displayName: 'labels.QuestionManagement',
      iconName: '',
      children: [
        {
          displayName: 'labels.addQuiz',
          iconName: 'description',
          route: 'admin/quiz',
        },
        {
          displayName: 'labels.quizList',
          iconName: '',
          route: 'admin/quiz-list',
        },
        {
          displayName: 'labels.category',
          iconName: '',
          route: 'admin/category',
        },
        {
          displayName: 'labels.categoryList',
          iconName: '',
          route: 'admin/category-list',
        },
      ],
    },
  ];

  public currentUserName = this.getCurrentUserFullName();

  constructor(private authenticationService: AuthenticationService) {}

  ngOnInit() {}

  logout() {
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
