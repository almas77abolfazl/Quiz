import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  template: `
    <div class="home-container">
      <h1>به کوییز خوش آمدید</h1>
      <div class="menu">
        <button (click)="startQuiz()">بازی تک نفره</button>
        <button (click)="start1v1()">بازی دو نفره 1v1</button>
        <button (click)="viewProfile()">پروفایل</button>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 2rem;
    }
    .menu {
      display: flex;
      gap: 1rem;
    }
    button {
      min-width: 150px;
    }
  `]
})
export class HomeComponent {
  constructor(private readonly router: Router) {}

  startQuiz() {
    this.router.navigate(['/quiz']);
  }

  start1v1() {
    this.router.navigate(['/1v1']);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }
}
