import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { GameFacade } from '../../core/data/game.facade';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly gameFacade = inject(GameFacade);

  readonly dailyMissions = this.gameFacade.dailyMissions;
  readonly categories = this.gameFacade.categories;
  readonly matchHistory = this.gameFacade.matchHistory;

  quickPlay(): void {
    this.router.navigate(['/quiz']);
  }

  goToQuiz(): void {
    this.router.navigate(['/quiz']);
  }

  goTo1v1(): void {
    this.router.navigate(['/1v1']);
  }

  startQuizWithCategory(catId: string): void {
    this.router.navigate(['/quiz'], { queryParams: { categoryId: catId } });
  }
}
