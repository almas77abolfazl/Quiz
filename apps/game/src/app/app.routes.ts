import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { QuizComponent } from './features/quiz/quiz.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'quiz', component: QuizComponent, canActivate: [authGuard] },
  { path: '1v1', loadComponent: () => import('./features/1v1/1v1.component').then(m => m.OneVOneComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
];
