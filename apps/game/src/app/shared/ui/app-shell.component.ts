import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TopBarComponent } from './top-bar.component';
import { BottomNavComponent } from './bottom-nav.component';
import { GameFacade } from '../../core/data/game.facade';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBarComponent, BottomNavComponent],
  template: `
    <div class="shell-backdrop">
      <app-bottom-nav />

      <div class="app-frame">
        <app-top-bar
          [displayName]="user().displayName"
          [coins]="user().coins"
          [seasonPoints]="user().seasonPoints"
          [seasonRank]="user().seasonRank"
          [dailyStreak]="user().dailyStreak"
          (profileClicked)="goToProfile()"
        />

        <main class="content-area">
          <ng-content />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell-backdrop {
        min-height: 100vh;
        background: radial-gradient(circle at 50% 10%, #1f1847 0%, #0f0c24 70%);
        display: flex;
        width: 100%;
        position: relative;
      }

      .app-frame {
        width: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: var(--bg-dark);
        position: relative;
        padding-bottom: 70px; /* space for mobile sticky bottom nav */
      }

      /* Desktop Responsive Layout (>=1024px) */
      @media (min-width: 1024px) {
        .app-frame {
          margin-right: 240px; /* width of right sidebar in RTL layout */
          padding-bottom: 0;
          max-width: 1200px;
          border-left: 1px solid var(--surface-border);
          box-shadow: 0 0 50px rgba(0, 0, 0, 0.4);
        }
      }

      .content-area {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly gameFacade = inject(GameFacade);

  readonly user = this.gameFacade.user;

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
