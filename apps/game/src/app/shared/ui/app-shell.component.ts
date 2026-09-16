import { Component, ChangeDetectionStrategy, OnInit, inject, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TopBarComponent } from './top-bar.component';
import { BottomNavComponent } from './bottom-nav.component';
import { PlayerHomeStore } from '../../core/services/player-home.store';

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopBarComponent, BottomNavComponent],
})
export class AppShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly playerHomeStore = inject(PlayerHomeStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.playerHomeStore.user;
  readonly seasonPoints = this.playerHomeStore.seasonPoints;
  readonly seasonRank = this.playerHomeStore.seasonRank;

  ngOnInit(): void {
    this.playerHomeStore
      .ensureLoaded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
}
