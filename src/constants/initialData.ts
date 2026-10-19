import { Category, HabitItem, RoutineTemplate, Achievement, MarketItem, UserProfile, AppSettings } from '@/types';

// Paleta oficial de 11 cores do Google Calendar usada no app Android
export const GOOGLE_CALENDAR_COLORS = [
  { id: '1', color: '#7986CB', name: 'Lavanda' },
  { id: '2', color: '#33B679', name: 'Sálvia' },
  { id: '3', color: '#8E24AA', name: 'Uva' },
  { id: '4', color: '#E67C73', name: 'Flamingo' },
  { id: '5', color: '#F6BF26', name: 'Banana' },
  { id: '6', color: '#F4511E', name: 'Tangerina' },
  { id: '7', color: '#039BE5', name: 'Pavão' },
  { id: '8', color: '#616161', name: 'Grafite' },
  { id: '9', color: '#3F51B5', name: 'Mirtilo' },
  { id: '10', color: '#0B8043', name: 'Manjericão' },
  { id: '11', color: '#D50000', name: 'Tomate' },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-saude',
    name: 'Saúde & Bem-estar',
    color: '#33B679',
    stickerId: null,
    metaMinutosSemanal: null,
  },
  {
    id: 'cat-trabalho',
    name: 'Trabalho & Foco',
    color: '#039BE5',
    stickerId: null,
    metaMinutosSemanal: null,
  },
  {
    id: 'cat-estudos',
    name: 'Estudos & Leitura',
    color: '#8E24AA',
    stickerId: null,
    metaMinutosSemanal: null,
  },
  {
    id: 'cat-fitness',
    name: 'Fitness & Treino',
    color: '#F4511E',
    stickerId: null,
    metaMinutosSemanal: null,
  },
  {
    id: 'cat-pessoal',
    name: 'Pessoal & Rotina',
    color: '#F6BF26',
    stickerId: null,
    metaMinutosSemanal: null,
  },
];

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_HABITS: HabitItem[] = [];

export const INITIAL_TEMPLATES: RoutineTemplate[] = [];

// Lista oficial equivalente a AchievementsList.kt do app Android nativo (100% bloqueadas inicialmente)
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'FIRST_HABIT',
    title: 'Primeiro Hábito!',
    description: 'Você concluiu seu primeiro hábito.',
    icon: 'checkmark-circle',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 10,
  },
  {
    id: 'FIRST_TEMPLATE',
    title: 'Tudo Organizado',
    description: 'Você criou ou aplicou seu primeiro template.',
    icon: 'grid',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 20,
  },
  {
    id: 'STREAK_3',
    title: 'Pegando o Ritmo',
    description: 'Manteve uma sequência de 3 dias.',
    icon: 'flame',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
    xpReward: 30,
  },
  {
    id: 'STREAK_7',
    title: 'Semana Perfeita',
    description: 'Manteve uma sequência de 7 dias consecutivos.',
    icon: 'trophy',
    unlocked: false,
    progress: 0,
    maxProgress: 7,
    xpReward: 70,
  },
  {
    id: 'STREAK_30',
    title: 'Mestre do Hábito',
    description: 'Manteve uma sequência de 30 dias.',
    icon: 'medal',
    unlocked: false,
    progress: 0,
    maxProgress: 30,
    xpReward: 300,
  },
  {
    id: 'COMPLETED_10',
    title: 'Dez em Dez',
    description: 'Você completou 10 hábitos no total.',
    icon: 'star',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
    xpReward: 50,
  },
  {
    id: 'COMPLETED_50',
    title: 'Meio Caminho Andado',
    description: 'Você completou 50 hábitos no total.',
    icon: 'ribbon',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
    xpReward: 100,
  },
  {
    id: 'COMPLETED_100',
    title: 'Centurião',
    description: 'Você completou 100 hábitos no total.',
    icon: 'shield-checkmark',
    unlocked: false,
    progress: 0,
    maxProgress: 100,
    xpReward: 200,
  },
];

// Lista oficial equivalente a MarketRepository.kt do app Android nativo (100% não possuídos inicialmente)
export const INITIAL_MARKET_ITEMS: MarketItem[] = [
  {
    id: 'stk_rocket',
    name: 'Foguete Neon',
    description: 'Para rotinas que decolam.',
    type: 'STICKER',
    rarity: 'RARE',
    basePrice: 150,
    finalPrice: 150,
    isOwned: false,
    iconName: 'rocket',
  },
  {
    id: 'stk_coffee',
    name: 'Café Lendário',
    description: 'Essencial para o foco extremo.',
    type: 'STICKER',
    rarity: 'LEGENDARY',
    basePrice: 200,
    finalPrice: 200,
    isOwned: false,
    iconName: 'cafe',
  },
  {
    id: 'stk_zen',
    name: 'Zen Master',
    description: 'Mantenha a calma e o equilíbrio.',
    type: 'STICKER',
    rarity: 'COMMON',
    basePrice: 50,
    finalPrice: 50,
    isOwned: false,
    iconName: 'fitness',
  },
  {
    id: 'stk_bolt',
    name: 'Energia Pura',
    description: 'Dê um choque na procrastinação.',
    type: 'STICKER',
    rarity: 'RARE',
    basePrice: 120,
    finalPrice: 120,
    isOwned: false,
    iconName: 'flash',
  },
  {
    id: 'med_time',
    name: 'Mestre do Tempo',
    description: 'Conquista máxima de pontualidade.',
    type: 'MEDAL',
    rarity: 'EPIC',
    basePrice: 500,
    finalPrice: 500,
    isOwned: false,
    iconName: 'timer',
  },
  {
    id: 'med_streak',
    name: 'Chama Eterna',
    description: 'Especialista em sequências longas.',
    type: 'MEDAL',
    rarity: 'LEGENDARY',
    basePrice: 1000,
    finalPrice: 1000,
    isOwned: false,
    iconName: 'flame',
  },
];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Usuário',
  email: '',
  photoUrl: null,
  totalPoints: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalCompleted: 0,
  focusMinutesToday: 0,
  isLoggedIn: false,
};

export const INITIAL_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  biometricLock: false,
  themeMode: 'dark',
  fontSizeMultiplier: 1.0,
  primaryColorHex: '#34D399',
  googleCalendarSyncEnabled: true,
};

export function getStreakColor(streakCount: number): string {
  if (streakCount >= 30) return '#6A1B9A';
  if (streakCount >= 7) return '#D32F2F';
  if (streakCount >= 3) return '#FFA000';
  return '#94A3B8';
}

