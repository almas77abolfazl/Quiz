import { Injectable, signal, Signal } from '@angular/core';
import { Difficulty } from '@quiz/contracts';
import {
  AnswerValidationResult,
  GameCategory,
  GameDailyMission,
  GameDataSource,
  GameMatchHistoryItem,
  GameQuestion,
  GameUser,
} from '../data/game-data-source.interface';

export interface DemoUser extends GameUser {}
export interface DemoCategory extends GameCategory {}
export interface DemoDailyMission extends GameDailyMission {}
export interface DemoMatchHistoryItem extends GameMatchHistoryItem {}

export interface DemoQuestion extends GameQuestion {
  correctIndex: number;
}

export interface DemoAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progressText?: string;
}

export interface DemoSeasonPrize {
  rankRange: string;
  title: string;
  rewardText: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class DemoGameDataSource extends GameDataSource {
  private readonly _currentUser = signal<DemoUser>({
    id: 'usr_demo_123',
    phone: '09123456789',
    username: 'alborz_gamer',
    displayName: 'البرز قهرمان',
    avatarKey: 'avatar_dragon',
    level: 12,
    xp: 280,
    xpToNextLevel: 400,
    coins: 1450,
    seasonPoints: 820,
    seasonRank: 14,
    dailyStreak: 5,
    totalGames: 78,
    totalWins1v1: 32,
    totalCorrectAnswers: 312,
    favoriteCategoryIds: ['cat_tech', 'cat_history', 'cat_sports'],
  });

  private readonly _categoriesSignal = signal<readonly DemoCategory[]>([
    {
      id: 'cat_general',
      title: 'اطلاعات عمومی',
      description: 'دانش عمومی و چیستان‌های جذاب',
      iconName: 'psychology',
      color: '#3b82f6',
      questionCount: 240,
      isPopular: true,
    },
    {
      id: 'cat_tech',
      title: 'فناوری و علوم',
      description: 'کامپیوتر، هوش مصنوعی و دنیای دیجیتال',
      iconName: 'devices',
      color: '#06b6d4',
      questionCount: 180,
      isPopular: true,
    },
    {
      id: 'cat_history',
      title: 'تاریخ و تمدن',
      description: 'تاریخ ایران و جهان از گذشته تا امروز',
      iconName: 'account_balance',
      color: '#f59e0b',
      questionCount: 150,
    },
    {
      id: 'cat_sports',
      title: 'ورزش و تندرستی',
      description: 'فوتبال، المپیک و اطلاعات ورزشی',
      iconName: 'sports_soccer',
      color: '#10b981',
      questionCount: 190,
      isPopular: true,
    },
    {
      id: 'cat_cinema',
      title: 'سینما و هنر',
      description: 'فیلم، موسیقی و شاهکارهای هنری',
      iconName: 'movie',
      color: '#ec4899',
      questionCount: 130,
    },
    {
      id: 'cat_geo',
      title: 'جغرافیا و گردشگری',
      description: 'کشورها، پایتخت‌ها و جاذبه‌های طبیعی',
      iconName: 'public',
      color: '#8b5cf6',
      questionCount: 160,
    },
  ]);

  private readonly _dailyMissionsSignal = signal<readonly DemoDailyMission[]>([
    {
      id: 'm1',
      title: 'پاسخ به ۱۰ سؤال صحیح در هر حالتی',
      rewardPoints: 5,
      currentProgress: 7,
      targetProgress: 10,
      isCompleted: false,
      icon: 'check_circle_outline',
    },
    {
      id: 'm2',
      title: 'پیروزی در ۱ مسابقه دو نفره (1v1)',
      rewardPoints: 3,
      currentProgress: 1,
      targetProgress: 1,
      isCompleted: true,
      icon: 'sports_esports',
    },
    {
      id: 'm3',
      title: 'تکمیل ۲ کوییز تک‌نفره با دقت بالای ۸۰٪',
      rewardPoints: 3,
      currentProgress: 1,
      targetProgress: 2,
      isCompleted: false,
      icon: 'workspace_premium',
    },
  ]);

  private readonly _matchHistorySignal = signal<readonly DemoMatchHistoryItem[]>([
    {
      id: 'h1',
      mode: '1V1',
      opponentName: 'کیارش_گیمر',
      opponentAvatar: 'avatar_wolf',
      result: 'WIN',
      scoreText: '۴ - ۲',
      earnedCoins: 8,
      earnedPoints: 5,
      dateText: '۱۰ دقیقه پیش',
    },
    {
      id: 'h2',
      mode: 'SOLO',
      result: 'COMPLETED',
      scoreText: '۵ از ۵ درست',
      earnedCoins: 7,
      earnedPoints: 10,
      dateText: '۱ ساعت پیش',
    },
    {
      id: 'h3',
      mode: '1V1',
      opponentName: 'مریم_سایه',
      opponentAvatar: 'avatar_cat',
      result: 'LOSS',
      scoreText: '۲ - ۳',
      earnedCoins: 1,
      earnedPoints: 1,
      dateText: 'دیروز',
    },
    {
      id: 'h4',
      mode: 'SOLO',
      result: 'COMPLETED',
      scoreText: '۴ از ۵ درست',
      earnedCoins: 5,
      earnedPoints: 6,
      dateText: '۲ روز پیش',
    },
  ]);

  readonly seasonPrizes: DemoSeasonPrize[] = [
    {
      rankRange: 'رتبه ۱ تا ۳',
      title: 'کنسول بازی یا ۵ میلیون تومان',
      rewardText: 'جایزه ویژه + ۵۰۰۰ سکه + نشان طلایی',
      icon: 'emoji_events',
    },
    {
      rankRange: 'رتبه ۴ تا ۱۰',
      title: 'هدفون گیمینگ حرفه‌ای',
      rewardText: 'جایزه فیزیکی + ۲۰۰۰ سکه + نشان نقره‌ای',
      icon: 'military_tech',
    },
    {
      rankRange: 'رتبه ۱۱ تا ۵۰',
      title: 'بسته سکه و بنر اختصاصی',
      rewardText: '۱۰۰۰ سکه + عنوان VIP فصلی',
      icon: 'workspace_premium',
    },
  ];

  readonly achievements: DemoAchievement[] = [
    {
      id: 'a1',
      title: 'استاد اطلاعات عمومی',
      description: 'پاسخ درست به ۱۰۰ سؤال عمومی',
      icon: 'military_tech',
      isUnlocked: true,
      progressText: '۱۰۰٪',
    },
    {
      id: 'a2',
      title: 'سرعت نور',
      description: 'پاسخ درست زیر ۵ ثانیه در ۵ سؤال متوالی',
      icon: 'bolt',
      isUnlocked: true,
      progressText: 'فعال',
    },
    {
      id: 'a3',
      title: 'شیر میدان (1v1)',
      description: '۱۰ پیروزی در رقابت دو نفره',
      icon: 'shield',
      isUnlocked: true,
      progressText: '۱۰/۱۰',
    },
    {
      id: 'a4',
      title: 'وفادار',
      description: 'ثبت ۷ روز Streak متوالی',
      icon: 'local_fire_department',
      isUnlocked: false,
      progressText: '۵/۷ روز',
    },
    {
      id: 'a5',
      title: 'گنجینه سکه',
      description: 'جمع‌آوری ۲۰۰۰ سکه در یک ماه',
      icon: 'monetization_on',
      isUnlocked: false,
      progressText: '۱۴۵۰/۲۰۰۰',
    },
  ];

  private readonly _sampleQuestions: DemoQuestion[] = [
    {
      id: 'q1',
      text: 'بلندترین قله کوهستانی ایران کدام است؟',
      categoryId: 'cat_geo',
      categoryTitle: 'جغرافیا',
      difficulty: Difficulty.EASY,
      options: ['دماوند', 'علم‌کوه', 'سبلان', 'دنا'],
      correctIndex: 0,
      explanation: 'قله دماوند با ارتفاع ۵۶۱۰ متر بلندترین قله ایران است.',
    },
    {
      id: 'q2',
      text: 'نخستین شبکه جهانی اینترنت تحت چه نامی آغاز به کار کرد؟',
      categoryId: 'cat_tech',
      categoryTitle: 'فناوری',
      difficulty: Difficulty.MEDIUM,
      options: ['WorldWideWeb', 'ARPANET', 'Ethernet', 'NSFNET'],
      correctIndex: 1,
      explanation: 'شبکه آربانت (ARPANET) اولین شبکه سوئیچینگ پاکتی پیشگام اینترنت بود.',
    },
    {
      id: 'q3',
      text: 'کدام پادشاه ایرانی منشور حقوق بشر باستان را صادر کرد؟',
      categoryId: 'cat_history',
      categoryTitle: 'تاریخ',
      difficulty: Difficulty.EASY,
      options: ['داریوش بزرگ', 'کوروش بزرگ', 'خشایارشا', 'انوشیروان'],
      correctIndex: 1,
      explanation: 'منشور کوروش بزرگ به عنوان نخستین اعلامیه حقوق بشر جهان شناخته می‌شود.',
    },
    {
      id: 'q4',
      text: 'کدام عنصر شیمیایی دارای نماد Au در جدول تناوبی است؟',
      categoryId: 'cat_general',
      categoryTitle: 'اطلاعات عمومی',
      difficulty: Difficulty.MEDIUM,
      options: ['نقره', 'مس', 'طلا', 'آلومینیوم'],
      correctIndex: 2,
      explanation: 'واژه Au از نام لاتین طلا (Aurum) گرفته شده است.',
    },
    {
      id: 'q5',
      text: 'کدام تیم بیشترین عنوان قهرمانی جام جهانی فوتبال را داراست؟',
      categoryId: 'cat_sports',
      categoryTitle: 'ورزش',
      difficulty: Difficulty.EASY,
      options: ['آلمان', 'ایتالیا', 'برزیل', 'آرژانتین'],
      correctIndex: 2,
      explanation: 'تیم ملی فوتبال برزیل با ۵ عنوان قهرمانی رکورددار جام جهانی است.',
    },
  ];

  override readonly currentUser: Signal<GameUser> = this._currentUser.asReadonly();
  override readonly categories: Signal<readonly GameCategory[]> =
    this._categoriesSignal.asReadonly();
  override readonly dailyMissions: Signal<readonly GameDailyMission[]> =
    this._dailyMissionsSignal.asReadonly();
  override readonly matchHistory: Signal<readonly GameMatchHistoryItem[]> =
    this._matchHistorySignal.asReadonly();

  get sampleQuestions(): DemoQuestion[] {
    return [...this._sampleQuestions];
  }

  override addCoins(amount: number): void {
    this._currentUser.update((u) => ({ ...u, coins: u.coins + amount }));
  }

  override addSeasonPoints(amount: number): void {
    this._currentUser.update((u) => ({ ...u, seasonPoints: u.seasonPoints + amount }));
  }

  override getQuestions(categoryId?: string, difficulty?: Difficulty): GameQuestion[] {
    let filtered = this._sampleQuestions;
    if (categoryId && categoryId !== 'ALL') {
      filtered = filtered.filter((q) => q.categoryId === categoryId);
    }
    if (difficulty) {
      filtered = filtered.filter((q) => q.difficulty === difficulty);
    }
    return filtered.map(({ correctIndex, ...publicProps }) => ({ ...publicProps }));
  }

  override validateAnswer(questionId: string, selectedIndex: number): AnswerValidationResult {
    const question = this._sampleQuestions.find((q) => q.id === questionId);
    if (!question) {
      return { isCorrect: false, correctIndex: -1 };
    }
    return {
      isCorrect: question.correctIndex === selectedIndex,
      correctIndex: question.correctIndex,
    };
  }

  getCategoryById(id: string): DemoCategory | undefined {
    return this._categoriesSignal().find((c) => c.id === id);
  }
}

/** Backward compatibility alias */
export const DemoGameDataService = DemoGameDataSource;
