import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AppShellComponent } from '../../shared/ui/app-shell.component';
import { AuthService } from '../../core/services/auth.service';
import { GameFacade } from '../../core/data/game.facade';

export interface DemoAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progressText?: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShellComponent],
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly gameFacade = inject(GameFacade);

  readonly user = this.gameFacade.user;
  readonly matchHistory = this.gameFacade.matchHistory;

  readonly achievements: DemoAchievement[] = [
    {
      id: 'a1',
      title: 'استاد اطلاعات عمومی',
      description: 'پاسخ درست به ۱۰۰ سؤال عمومی',
      icon: '🎖️',
      isUnlocked: true,
      progressText: '۱۰۰٪',
    },
    {
      id: 'a2',
      title: 'سرعت نور',
      description: 'پاسخ درست زیر ۵ ثانیه در ۵ سؤال متوالی',
      icon: '⚡',
      isUnlocked: true,
      progressText: 'فعال',
    },
    {
      id: 'a3',
      title: 'شیر میدان (1v1)',
      description: '۱۰ پیروزی در رقابت دو نفره',
      icon: '🛡️',
      isUnlocked: true,
      progressText: '۱۰/۱۰',
    },
    {
      id: 'a4',
      title: 'وفادار',
      description: 'ثبت ۷ روز Streak متوالی',
      icon: '🔥',
      isUnlocked: false,
      progressText: '۵/۷ روز',
    },
    {
      id: 'a5',
      title: 'گنجینه سکه',
      description: 'جمع‌آوری ۲۰۰۰ سکه در یک ماه',
      icon: '🪙',
      isUnlocked: false,
      progressText: '۱۴۵۰/۲۰۰۰',
    },
  ];

  readonly formattedCoins = computed(() => this.user().coins.toLocaleString('fa-IR'));

  editProfilePlaceholder(): void {
    alert('امکان ویرایش نام نمایشی و آواتار در نسخه آینده فعال خواهد شد.');
  }

  logout(): void {
    this.auth.setAccessToken(null);
    this.router.navigate(['/login']);
  }
}
