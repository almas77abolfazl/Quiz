import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('quiz_access_token');
  if (!token) {
    return false;
  }
  return true;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('quiz_access_token');
  if (token) {
    return false;
  }
  return true;
};
