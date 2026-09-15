import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'quiz',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/quiz/quiz-setup.component').then((m) => m.QuizSetupComponent),
      },
      {
        path: 'play',
        loadComponent: () =>
          import('./features/quiz/quiz-play.component').then((m) => m.QuizPlayComponent),
      },
      {
        path: 'result',
        loadComponent: () =>
          import('./features/quiz/quiz-result.component').then((m) => m.QuizResultComponent),
      },
    ],
  },
  {
    path: '1v1',
    loadComponent: () => import('./features/1v1/1v1.component').then((m) => m.OneVOneComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
