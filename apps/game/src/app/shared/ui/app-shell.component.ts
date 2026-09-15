import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TopBarComponent } from './top-bar.component';
import { BottomNavComponent } from './bottom-nav.component';
import { DemoGameDataService } from '../../core/demo/demo-game-data.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, TopBarComponent, BottomNavComponent],
  template: `
    <div class="shell-backdrop">
      <div class="app-frame">
        <app-top-bar
          [displayName]="user().displayName"
          [coins]="user().coins"
          [seasonPoints]="user().seasonPoints"
          [seasonRank]="user().seasonRank"
          [dailyStreak]="user().dailyStreak"
          (onProfileClick)="goToProfile()"
        />

        <main class="content-area">
          <ng-content></ng-content>
        </main>

        <app-bottom-nav />
      </div>
    </div>
  `,
  styles: [
    `
      .shell-backdrop {
        min-height: 100vh;
        background: radial-gradient(circle at 50% 10%, #1f1847 0%, #0f0c24 70%);
        display: flex;
        justify-content: center;
        width: 100%;
      }

      .app-frame {
        width: 100%;
        max-width: 480px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: var(--bg-dark);
        position: relative;
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
        padding-bottom: 70px; /* space for sticky bottom nav */
      }

      @media (min-width: 769px) {
        .app-frame {
          border-left: 1px solid var(--surface-border);
          border-right: 1px solid var(--surface-border);
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
  private readonly demoData = inject(DemoGameDataService);

  readonly user = this.demoData.currentUser;

  goToProfile() {
    this.router.navigate(['/profile']);
  }
}
