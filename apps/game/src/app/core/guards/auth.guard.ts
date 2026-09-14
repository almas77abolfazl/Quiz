import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CanActivateFn, Router } from '@angular/router';

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
