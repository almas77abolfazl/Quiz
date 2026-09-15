import { PrizeType } from '@prisma/client';

export interface SeedSeasonPrize {
  id: string;
  rank: number;
  type: PrizeType;
  title: string;
  description: string;
  coinAmount?: number;
}

export interface SeedSeason {
  id: string;
  jalaliYear: number;
  jalaliMonth: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  prizes: SeedSeasonPrize[];
}

export const JALALI_MONTH_NAMES: Record<number, string> = {
  1: 'فروردین',
  2: 'اردیبهشت',
  3: 'خرداد',
  4: 'تیر',
  5: 'مرداد',
  6: 'شهریور',
  7: 'مهر',
  8: 'آبان',
  9: 'آذر',
  10: 'دی',
  11: 'بهمن',
  12: 'اسفند',
};

export function getActiveDevelopmentSeason(): SeedSeason {
  const now = new Date();

  // Convert current system time to Jalali (Solar Hijri) date using Node Intl
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Tehran',
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const jy = parseInt(map.year, 10);
  const jm = parseInt(map.month, 10);
  const jd = parseInt(map.day, 10);

  // Day 1 of current Jalali month in Asia/Tehran timezone
  const startsAt = new Date(now);
  startsAt.setDate(startsAt.getDate() - (jd - 1));
  startsAt.setHours(0, 0, 0, 0);

  // Determine month length
  let monthLength = 31;
  if (jm >= 7 && jm <= 11) {
    monthLength = 30;
  } else if (jm === 12) {
    const test29 = new Date(startsAt);
    test29.setDate(test29.getDate() + 29);
    const testParts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      month: 'numeric',
      timeZone: 'Asia/Tehran',
    }).formatToParts(test29);
    const testMonth = parseInt(testParts.find((p) => p.type === 'month')?.value || '12', 10);
    monthLength = testMonth === 12 ? 30 : 29;
  }

  // End boundary of current Jalali month
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + monthLength);
  endsAt.setMilliseconds(endsAt.getMilliseconds() - 1);

  const monthName = JALALI_MONTH_NAMES[jm] || `ماه ${jm}`;
  const titlePrefix = `فصل توسعه - ${monthName} ${jy}`;

  return {
    id: '00000000-0000-4000-c000-000000000001',
    jalaliYear: jy,
    jalaliMonth: jm,
    startsAt,
    endsAt,
    isActive: true,
    prizes: [
      {
        id: '00000000-0000-4000-c000-000000000101',
        rank: 1,
        type: PrizeType.COINS,
        title: `پاداش سکه ${titlePrefix} - رتبه ۱`,
        description: '۵۰۰ سکه پاداش رتبه اول فصل آزمایش توسعه',
        coinAmount: 500,
      },
      {
        id: '00000000-0000-4000-c000-000000000102',
        rank: 2,
        type: PrizeType.BADGE,
        title: `نشان قهرمان ${titlePrefix}`,
        description: 'نشان اختصاصی رتبه دوم فصل توسعه',
      },
      {
        id: '00000000-0000-4000-c000-000000000103',
        rank: 3,
        type: PrizeType.PROFILE_BANNER,
        title: `بنر بنفش ${titlePrefix}`,
        description: 'بنر اختصاصی پروفایل برتر فصل توسعه',
      },
      {
        id: '00000000-0000-4000-c000-000000000104',
        rank: 4,
        type: PrizeType.TITLE,
        title: `عنوان استاد کوییز ${titlePrefix}`,
        description: 'عنوان نمایشی ویژه در پروفایل کاربر توسعه',
      },
    ],
  };
}
