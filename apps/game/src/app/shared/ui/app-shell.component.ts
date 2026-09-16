import { Component, ChangeDetectionStrategy, OnInit, inject, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopBarComponent } from './top-bar.component';
import { BottomNavComponent } from './bottom-nav.component';
import { PlayerStore } from '../../core/services/player.store';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBarComponent, BottomNavComponent],
})
export class AppShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly playerStore = inject(PlayerStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.playerStore.user;
  readonly seasonPoints = this.playerStore.seasonPoints;
  readonly seasonRank = this.playerStore.seasonRank;

  ngOnInit(): void {
    this.playerStore
      .ensureLoaded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
