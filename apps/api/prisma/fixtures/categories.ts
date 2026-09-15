export interface SeedCategory {
  id: string;
  title: string;
  description: string;
  coverKey: string | null;
  isActive: boolean;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    id: '00000000-0000-4000-b000-000000000001',
    title: 'اطلاعات عمومی',
    description: 'سوالات دانش عمومی، علمی، طبیعت و مفاهیم کاربردی جهان',
    coverKey: null,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-b000-000000000002',
    title: 'تاریخ ایران',
    description: 'سوالات تاریخی ایران از باستان تا دوران معاصر و مشاهیر',
    coverKey: null,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-b000-000000000003',
    title: 'جغرافیا',
    description: 'سوالات جغرافیای ایران و جهان، پایتخت‌ها، دریاها و کوه‌ها',
    coverKey: null,
    isActive: true,
  },
  {
    id: '00000000-0000-4000-b000-000000000004',
    title: 'فناوری',
    description: 'سوالات علوم رایانه، برنامه‌نویسی، هوش مصنوعی و اینترنت',
    coverKey: null,
    isActive: true,
  },
];

