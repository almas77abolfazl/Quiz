import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TopBarComponent } from './top-bar.component';
import { BottomNavComponent } from './bottom-nav.component';
import { GameFacade } from '../../core/data/game.facade';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBarComponent, BottomNavComponent],
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly gameFacade = inject(GameFacade);

  readonly user = this.gameFacade.user;

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
