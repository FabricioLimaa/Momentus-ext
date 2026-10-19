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
  googleCalendarEventId?: string | null;
  saveToGoogle?: boolean;
}

export interface TemplateItem {
  id: string;
  title: string;
  description?: string | null;
  timeStart: string; // "07:30" ou "07:30:00"
  timeEnd?: string;  // "08:00" ou "08:00:00"
  durationMinutes?: number;
  categoryId: string;
  templateId?: string | null;
  order?: number;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  description?: string | null;
  icon?: string;
  color?: string;
  lastUpdated?: string | null;
  items: TemplateItem[];
}

export interface SharedTemplate {
  template: {
    id: string;
    nome: string;
    descricao?: string | null;
    lastUpdated?: any;
  };
  eventos: Array<{
    id: string;
    titulo: string;
    descricao?: string | null;
    horarioInicio?: string;
    horarioTermino?: string;
    horarioInicioString?: string;
    horarioTerminoString?: string;
    categoryId: string;
    templateId?: string | null;
    ordem?: number;
  }>;
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
  photoUrl?: string | null;
  totalPoints: number; // XP total que dita o nível e é usado como saldo na loja
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  focusMinutesToday: number;
  isLoggedIn?: boolean;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  biometricLock: boolean;
  themeMode: 'system' | 'dark' | 'light';
  fontSizeMultiplier: number;
  primaryColorHex: string;
  googleCalendarSyncEnabled: boolean;
  lastBackupAt?: string | null;
  termsAccepted?: boolean;
  termsAcceptedVersion?: number;
  termsAcceptedAt?: string | null;
}


