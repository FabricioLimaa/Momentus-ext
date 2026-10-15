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
    stickerId: 'stk_zen',
    metaMinutosSemanal: 180, // 3h semanais
  },
  {
    id: 'cat-trabalho',
    name: 'Trabalho & Foco',
    color: '#039BE5',
    stickerId: 'stk_rocket',
    metaMinutosSemanal: 600, // 10h semanais
  },
  {
    id: 'cat-estudos',
    name: 'Estudos & Leitura',
    color: '#8E24AA',
    stickerId: 'stk_coffee',
    metaMinutosSemanal: 300, // 5h semanais
  },
  {
    id: 'cat-fitness',
    name: 'Fitness & Treino',
    color: '#F4511E',
    stickerId: 'stk_bolt',
    metaMinutosSemanal: 240, // 4h semanais
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

export const INITIAL_HABITS: HabitItem[] = [
  {
    id: 'h-1',
    title: 'Meditação Matinal e Mindfulness',
    description: '10 minutos de respiração e foco antes de iniciar o dia',
    timeStart: '07:00',
    timeEnd: '07:15',
    categoryId: 'cat-saude',
    completed: true,
    date: getTodayDateString(),
    streak: 5,
  },
  {
    id: 'h-2',
    title: 'Revisar Metas e Prioridades',
    description: 'Definir as 3 tarefas inegociáveis do dia de trabalho',
    timeStart: '08:00',
    timeEnd: '08:30',
    categoryId: 'cat-trabalho',
    completed: false,
    date: getTodayDateString(),
    streak: 4,
  },
  {
    id: 'h-3',
    title: 'Treino de Força / Hipertrofia',
    description: 'Treino focado na academia com registro de cargas',
    timeStart: '18:00',
    timeEnd: '19:00',
    categoryId: 'cat-fitness',
    completed: false,
    date: getTodayDateString(),
    streak: 3,
  },
  {
    id: 'h-4',
    title: 'Leitura de 20 Páginas',
    description: 'Leitura de livro técnico ou desenvolvimento pessoal',
    timeStart: '21:30',
    timeEnd: '22:00',
    categoryId: 'cat-estudos',
    completed: false,
    date: getTodayDateString(),
    streak: 6,
  },
];

export const INITIAL_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'tmpl-matinal',
    title: 'Rotina Matinal Blindada',
    description: 'Comece seu dia com energia, clareza e sem celular na primeira hora.',
    icon: 'sunny',
    color: '#F59E0B',
    items: [
      { id: 'ti-1', title: 'Beber 500ml de água', durationMinutes: 5, timeStart: '06:30', categoryId: 'cat-saude' },
      { id: 'ti-2', title: 'Alongamento & Mobilidade', durationMinutes: 15, timeStart: '06:35', categoryId: 'cat-fitness' },
      { id: 'ti-3', title: 'Meditação / Silêncio', durationMinutes: 10, timeStart: '06:50', categoryId: 'cat-saude' },
      { id: 'ti-4', title: 'Café & Planejamento', durationMinutes: 20, timeStart: '07:00', categoryId: 'cat-trabalho' },
    ],
  },
  {
    id: 'tmpl-foco',
    title: 'Bloco de Foco Profundo (Deep Work)',
    description: 'Estrutura comprovada para alta produtividade sem distrações.',
    icon: 'flame',
    color: '#039BE5',
    items: [
      { id: 'ti-5', title: 'Sessão 1 de Foco Imersivo (50m)', durationMinutes: 50, timeStart: '09:00', categoryId: 'cat-trabalho' },
      { id: 'ti-6', title: 'Pausa Ativa (Caminhada/Água)', durationMinutes: 10, timeStart: '09:50', categoryId: 'cat-saude' },
      { id: 'ti-7', title: 'Sessão 2 de Foco Imersivo (50m)', durationMinutes: 50, timeStart: '10:00', categoryId: 'cat-trabalho' },
      { id: 'ti-8', title: 'Processar Emails e Mensagens', durationMinutes: 20, timeStart: '10:50', categoryId: 'cat-trabalho' },
    ],
  },
  {
    id: 'tmpl-noturno',
    title: 'Ritual Noturno Reparador',
    description: 'Prepare o cérebro e o corpo para um sono profundo.',
    icon: 'moon',
    color: '#8E24AA',
    items: [
      { id: 'ti-9', title: 'Desligar Telas e Notificações', durationMinutes: 5, timeStart: '21:00', categoryId: 'cat-saude' },
      { id: 'ti-10', title: 'Organizar mesa para amanhã', durationMinutes: 15, timeStart: '21:05', categoryId: 'cat-pessoal' },
      { id: 'ti-11', title: 'Leitura relaxante de livro físico', durationMinutes: 30, timeStart: '21:20', categoryId: 'cat-estudos' },
      { id: 'ti-12', title: 'Luz apagada e sono', durationMinutes: 480, timeStart: '22:00', categoryId: 'cat-saude' },
    ],
  },
];

// Lista oficial equivalente a AchievementsList.kt do app Android nativo
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'FIRST_HABIT',
    title: 'Primeiro Hábito!',
    description: 'Você concluiu seu primeiro hábito.',
    icon: 'checkmark-circle',
    unlocked: true,
    unlockedAt: '2026-10-10',
    progress: 1,
    maxProgress: 1,
    xpReward: 10,
  },
  {
    id: 'FIRST_TEMPLATE',
    title: 'Tudo Organizado',
    description: 'Você criou ou aplicou seu primeiro template.',
    icon: 'grid',
    unlocked: true,
    unlockedAt: '2026-10-11',
    progress: 1,
    maxProgress: 1,
    xpReward: 20,
  },
  {
    id: 'STREAK_3',
    title: 'Pegando o Ritmo',
    description: 'Manteve uma sequência de 3 dias.',
    icon: 'flame',
    unlocked: true,
    unlockedAt: '2026-10-12',
    progress: 3,
    maxProgress: 3,
    xpReward: 30,
  },
  {
    id: 'STREAK_7',
    title: 'Semana Perfeita',
    description: 'Manteve uma sequência de 7 dias consecutivos.',
    icon: 'trophy',
    unlocked: false,
    progress: 5,
    maxProgress: 7,
    xpReward: 70,
  },
  {
    id: 'STREAK_30',
    title: 'Mestre do Hábito',
    description: 'Manteve uma sequência de 30 dias.',
    icon: 'medal',
    unlocked: false,
    progress: 5,
    maxProgress: 30,
    xpReward: 300,
  },
  {
    id: 'COMPLETED_10',
    title: 'Dez em Dez',
    description: 'Você completou 10 hábitos no total.',
    icon: 'star',
    unlocked: true,
    unlockedAt: '2026-10-12',
    progress: 10,
    maxProgress: 10,
    xpReward: 50,
  },
  {
    id: 'COMPLETED_50',
    title: 'Meio Caminho Andado',
    description: 'Você completou 50 hábitos no total.',
    icon: 'ribbon',
    unlocked: false,
    progress: 28,
    maxProgress: 50,
    xpReward: 100,
  },
  {
    id: 'COMPLETED_100',
    title: 'Centurião',
    description: 'Você completou 100 hábitos no total.',
    icon: 'shield-checkmark',
    unlocked: false,
    progress: 28,
    maxProgress: 100,
    xpReward: 200,
  },
];

// Lista oficial equivalente a MarketRepository.kt do app Android nativo
export const INITIAL_MARKET_ITEMS: MarketItem[] = [
  {
    id: 'stk_rocket',
    name: 'Foguete Neon',
    description: 'Para rotinas que decolam.',
    type: 'STICKER',
    rarity: 'RARE',
    basePrice: 150,
    finalPrice: 150, // 150 * 1
    isOwned: true,
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
    isOwned: true,
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
  name: 'Fabrício Lima',
  email: 'fabricio@momentus.app',
  totalPoints: 480, // Focado (Nível 3)
  currentStreak: 5,
  bestStreak: 12,
  totalCompleted: 28,
  focusMinutesToday: 25,
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

