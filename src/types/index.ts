export interface Category {
  id: string;
  name: string;
  color: string; // Hex color from Google Calendar palette
  icon?: string;
  stickerId?: string | null;
  metaMinutosSemanal?: number | null; // Meta semanal em minutos (ex: 300 = 5 horas)
}

export interface HabitItem {
  id: string;
  title: string;
  description?: string;
  timeStart: string; // "07:30"
  timeEnd?: string;  // "08:00"
  categoryId: string;
  completed: boolean;
  date: string; // "YYYY-MM-DD"
  streak: number;
}

export interface TemplateItem {
  id: string;
  title: string;
  durationMinutes: number;
  timeStart: string;
  categoryId: string;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  items: TemplateItem[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  xpReward: number;
}

export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemType = 'STICKER' | 'MEDAL' | 'FRAME';

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  basePrice: number;
  finalPrice: number;
  isOwned: boolean;
  iconName: string;
}

export interface UserProfile {
  name: string;
  email: string;
  totalPoints: number; // XP total que dita o nível e é usado como saldo na loja
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  focusMinutesToday: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  biometricLock: boolean;
  themeMode: 'system' | 'dark' | 'light';
}
