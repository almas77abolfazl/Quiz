import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  DestroyRef,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { AuthService } from '../../core/services/auth.service';
import { PlayerStore } from '../../core/services/player.store';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent],
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly playerStore = inject(PlayerStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = this.playerStore.user;
  readonly maskedPhone = this.playerStore.maskedPhone;
  readonly seasonRank = this.playerStore.seasonRank;
  readonly seasonPoints = this.playerStore.seasonPoints;
  readonly recentSoloGames = this.playerStore.recentSoloGames;
  readonly stats = this.playerStore.stats;
  readonly favoriteCategories = this.playerStore.favoriteCategories;
  readonly earnedBadges = this.playerStore.earnedBadges;
  readonly isLoading = this.playerStore.isLoading;
  readonly loadError = this.playerStore.loadError;

  readonly formattedCoins = computed(() => this.user().coins.toLocaleString('fa-IR'));

  ngOnInit(): void {
    this.playerStore
      .ensureProfileLoaded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  retry(): void {
    this.playerStore
      .refreshProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  logout(): void {
    this.auth.setAccessToken(null);
    this.router.navigate(['/login']);
  }
}
