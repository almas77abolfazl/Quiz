import { UserRole } from '@prisma/client';

export interface SeedUser {
  id: string;
  phone: string;
  username: string;
  displayName: string;
  role: UserRole;
  coins?: number;
  dailyStreak?: number;
}

export const SEED_USERS: SeedUser[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    phone: '09120000001',
    username: 'dev.root',
    displayName: 'مدیر اصلی توسعه',
    role: UserRole.ROOT_ADMIN,
    coins: 1000,
    dailyStreak: 5,
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    phone: '09120000002',
    username: 'dev.content',
    displayName: 'کارشناس محتوای توسعه',
    role: UserRole.CONTENT_SPECIALIST,
    coins: 500,
    dailyStreak: 3,
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    phone: '09120000003',
    username: 'dev.support',
    displayName: 'پشتیبان توسعه',
    role: UserRole.SUPPORT,
    coins: 200,
    dailyStreak: 1,
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    phone: '09120000004',
    username: 'dev.player1',
    displayName: 'بازیکن توسعه ۱',
    role: UserRole.PLAYER,
    coins: 150,
    dailyStreak: 2,
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    phone: '09120000005',
    username: 'dev.player2',
    displayName: 'بازیکن توسعه ۲',
    role: UserRole.PLAYER,
    coins: 100,
    dailyStreak: 0,
  },
];

