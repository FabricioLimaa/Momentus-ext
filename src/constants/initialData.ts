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
    id: 'cat-outros',
    name: 'Outros',
    color: '#616161',
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

/**
 * Converte data do formato 'YYYY-MM-DD' para o formato brasileiro 'DD-MM-YYYY'.
 * Ex: '2026-10-21' -> '21-10-2026'
 */
export const formatDateToBr = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  }
  return dateStr;
};

/**
 * Converte data de 'DD-MM-YYYY' ou 'DD/MM/YYYY' para o formato chave 'YYYY-MM-DD'.
 */
export const parseBrDateToIso = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const separator = dateStr.includes('/') ? '/' : '-';
  const parts = dateStr.split(separator);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
};

/**
 * Retorna as datas ('YYYY-MM-DD') onde TODAS as rotinas planejadas foram concluídas.
 * Um dia só é considerado concluído se:
 * 1. Existe ao menos 1 rotina naquele dia.
 * 2. 100% das rotinas daquele dia estão marcadas como concluídas.
 */
export const getFullyCompletedDates = (habits: HabitItem[]): string[] => {
  const byDate = new Map<string, { total: number; completed: number }>();
  for (const h of habits) {
    if (!h.date) continue;
    const current = byDate.get(h.date) || { total: 0, completed: 0 };
    current.total += 1;
    if (h.completed) current.completed += 1;
    byDate.set(h.date, current);
  }

  const completedDays: string[] = [];
  byDate.forEach((val, dateStr) => {
    if (val.total > 0 && val.completed === val.total) {
      completedDays.push(dateStr);
    }
  });

  return completedDays.sort();
};

function getPreviousDateStr(dateStr: string): string {
  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const prevY = date.getFullYear();
  const prevM = String(date.getMonth() + 1).padStart(2, '0');
  const prevD = String(date.getDate()).padStart(2, '0');
  return `${prevY}-${prevM}-${prevD}`;
}

/**
 * Calcula a sequência diária (streak) com base estrita nos dias 100% concluídos.
 * Segue a lógica oficial de CategoryRepository.kt:355-371 do app nativo.
 */
export const calculateStreakFromCompletedDays = (
  completedDays: string[],
  todayStr: string
): number => {
  if (completedDays.length === 0) return 0;

  const yesterdayStr = getPreviousDateStr(todayStr);
  const lastCompleted = completedDays[completedDays.length - 1];
  if (lastCompleted !== todayStr && lastCompleted !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expectedDateStr: string | null = null;

  for (let i = completedDays.length - 1; i >= 0; i--) {
    const curDateStr = completedDays[i];
    if (expectedDateStr === null) {
      streak = 1;
      expectedDateStr = getPreviousDateStr(curDateStr);
    } else if (curDateStr === expectedDateStr) {
      streak += 1;
      expectedDateStr = getPreviousDateStr(curDateStr);
    } else {
      break;
    }
  }

  return streak;
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
  termsAccepted: false,
  termsAcceptedVersion: 0,
  termsAcceptedAt: null,
};

export function getStreakColor(streakCount: number): string {
  if (streakCount >= 30) return '#6A1B9A';
  if (streakCount >= 7) return '#D32F2F';
  if (streakCount >= 3) return '#FFA000';
  return '#94A3B8';
}

/**
 * Retorna a data formatada por extenso em português.
 * Ex: '2026-10-27' -> 'Terça-feira, 27 de Outubro'
 */
export function formatFullDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return `${weekdays[date.getDay()]}, ${d} de ${months[m - 1]}`;
  } catch {
    return dateStr;
  }
}

export interface DayStripItem {
  dateStr: string;
  dayNum: string;
  weekDayName: string;
  isToday: boolean;
  hasHabits: boolean;
  allCompleted: boolean;
}

/**
 * Retorna uma fita de 7 dias centrada na data de referência (-3 dias até +3 dias).
 */
export function getWeekDaysStrip(
  centerDateStr: string,
  todayStr: string,
  habitsByDateMap?: Map<string, { total: number; completed: number }>
): DayStripItem[] {
  try {
    const [y, m, d] = centerDateStr.split('-').map(Number);
    const centerDate = new Date(y, m - 1, d);
    const weekdayShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    const items: DayStripItem[] = [];
    for (let offset = -3; offset <= 3; offset++) {
      const curDate = new Date(centerDate);
      curDate.setDate(curDate.getDate() + offset);

      const curY = curDate.getFullYear();
      const curM = String(curDate.getMonth() + 1).padStart(2, '0');
      const curD = String(curDate.getDate()).padStart(2, '0');
      const dateKey = `${curY}-${curM}-${curD}`;

      const habitInfo = habitsByDateMap?.get(dateKey);
      const hasHabits = Boolean(habitInfo && habitInfo.total > 0);
      const allCompleted = Boolean(hasHabits && habitInfo!.completed === habitInfo!.total);

      items.push({
        dateStr: dateKey,
        dayNum: String(curDate.getDate()).padStart(2, '0'),
        weekDayName: weekdayShort[curDate.getDay()],
        isToday: dateKey === todayStr,
        hasHabits,
        allCompleted,
      });
    }
    return items;
  } catch {
    return [];
  }
}

