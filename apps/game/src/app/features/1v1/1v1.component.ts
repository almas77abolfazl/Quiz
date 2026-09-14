import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-1v1',
  standalone: true,
  imports: [],
  template: `
    <div class="container">
      <h2>بازی دو نفره</h2>
      <button mat-raised-button color="accent" (click)="findMatch()">یافتن حریف</button>
      <button mat-button (click)="back()">بازگشت</button>
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 2rem auto;
    }
  `]
})
export class OneVOneComponent {
  constructor(private readonly router: Router) {}

  findMatch() {
    console.log('Joining matchmaking...');
  }

  back() {
    this.router.navigate(['/']);
  }
}
