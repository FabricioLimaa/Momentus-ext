import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category, HabitItem } from '@/types';
import { getTodayDateString } from '@/constants/initialData';
import { MomentusColors } from '@/constants/theme';
import { MomentusLog } from '@/util/logger';
import {
  MOMENTUS_WIDGET_NAME,
  WIDGET_STORAGE_KEYS,
  type MomentusWidgetSnapshot,
  type MomentusWidgetTask,
} from '@/widgets/types';

const SHORT_WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SHORT_MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function getEffectiveEndTime(timeStart: string, timeEnd?: string): string {
  if (timeEnd && timeEnd.includes(':')) return timeEnd;
  const startMinutes = parseTimeToMinutes(timeStart);
  const endMinutes = (startMinutes + 60) % (24 * 60);
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function formatDateLabel(now: Date): string {
  const weekday = SHORT_WEEKDAYS_PT[now.getDay()] || 'Hoje';
  const month = SHORT_MONTHS_PT[now.getMonth()] || '';
  return `${weekday}, ${now.getDate()} ${month}`;
}

function formatClock(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Constrói o snapshot otimizado do widget para o instante `now`,
 * ordenando por relevância imediata: Em andamento agora → Próximos → Pendentes passados → Concluídos.
 */
export function buildWidgetSnapshot(
  habits: HabitItem[],
  categories: Category[],
  currentStreak: number,
  primaryColor: string,
  isDark: boolean,
  now: Date = new Date(),
  isOled: boolean = false
): MomentusWidgetSnapshot {
  const todayStr = getTodayDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const todayHabits = habits.filter((h) => h.date === todayStr);
  const totalCount = todayHabits.length;
  const completedCount = todayHabits.filter((h) => h.completed).length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const enriched = todayHabits.map((h) => {
    const startMin = parseTimeToMinutes(h.timeStart);
    const effectiveEnd = getEffectiveEndTime(h.timeStart, h.timeEnd);
    let endMin = parseTimeToMinutes(effectiveEnd);
    if (endMin < startMin) {
      endMin = 24 * 60;
    }

    const isOngoing = currentMinutes >= startMin && currentMinutes <= endMin;
    const isUpcoming = currentMinutes < startMin;
    const cat = categoryMap.get(h.categoryId);

    // Prioridade visual:
    // 0: Em andamento e não concluído ("Agora")
    // 1: Próximo horário ainda hoje e não concluído
    // 2: Pendente atrasado de hoje
    // 3: Concluído (mantido por último para referência)
    let priorityRank = 3;
    if (!h.completed) {
      if (isOngoing) priorityRank = 0;
      else if (isUpcoming) priorityRank = 1;
      else priorityRank = 2;
    }

    const task: MomentusWidgetTask = {
      id: h.id,
      title: h.title,
      timeStart: h.timeStart,
      timeEnd: effectiveEnd,
      categoryName: cat?.name || 'Geral',
      categoryColor: cat?.color || primaryColor || MomentusColors.emeraldNeon,
      completed: h.completed,
      isOngoing,
    };

    return { task, priorityRank, startMin };
  });

  enriched.sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
    return a.startMin - b.startMin;
  });

  return {
    date: todayStr,
    dateLabel: formatDateLabel(now),
    updatedAt: formatClock(now),
    currentStreak,
    completedCount,
    totalCount,
    progress,
    primaryColor: primaryColor || MomentusColors.emeraldNeon,
    isDark,
    isOled,
    tasks: enriched.slice(0, 4).map((e) => e.task),
    toggledHabitIds: [],
  };
}

/**
 * Gera entradas programadas para a timeline do WidgetKit no iOS,
 * permitindo troca automática do destaque "Agora" conforme os horários das rotinas passam.
 */
export function buildIosWidgetTimeline(
  habits: HabitItem[],
  categories: Category[],
  currentStreak: number,
  primaryColor: string,
  isDark: boolean,
  isOled: boolean = false
): Array<{ date: Date; props: MomentusWidgetSnapshot }> {
  const now = new Date();
  const todayStr = getTodayDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const transitionMinutes = new Set<number>();
  habits
    .filter((h) => h.date === todayStr && !h.completed)
    .forEach((h) => {
      const startMin = parseTimeToMinutes(h.timeStart);
      const endMin = parseTimeToMinutes(getEffectiveEndTime(h.timeStart, h.timeEnd));
      if (startMin > currentMinutes && startMin < 24 * 60) {
        transitionMinutes.add(startMin);
      }
      if (endMin > currentMinutes && endMin < 24 * 60) {
        transitionMinutes.add(endMin + 1);
      }
    });

  const sortedFutureMinutes = Array.from(transitionMinutes)
    .sort((a, b) => a - b)
    .slice(0, 7);

  const entries: Array<{ date: Date; props: MomentusWidgetSnapshot }> = [
    {
      date: now,
      props: buildWidgetSnapshot(habits, categories, currentStreak, primaryColor, isDark, now, isOled),
    },
  ];

  for (const mins of sortedFutureMinutes) {
    const entryDate = new Date(now);
    entryDate.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    entries.push({
      date: entryDate,
      props: buildWidgetSnapshot(
        habits,
        categories,
        currentStreak,
        primaryColor,
        isDark,
        entryDate,
        isOled
      ),
    });
  }

  return entries;
}

/**
 * Sincroniza o estado atual de hábitos e streak com os widgets nativos de Android e iOS.
 * 100% seguro na Web e no Expo Go (no-op silencioso quando os módulos nativos não existem).
 */
export async function syncHomeScreenWidgets(
  habits: HabitItem[],
  categories: Category[],
  currentStreak: number,
  primaryColor: string,
  isDark: boolean,
  isOled: boolean = false
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const snapshot = buildWidgetSnapshot(
    habits,
    categories,
    currentStreak,
    primaryColor,
    isDark,
    new Date(),
    isOled
  );

  // 1. Persiste o snapshot compartilhado (usado pelo worker headless do Android)
  try {
    await AsyncStorage.setItem(WIDGET_STORAGE_KEYS.SNAPSHOT, JSON.stringify(snapshot));
  } catch (err) {
    MomentusLog.warn('APP', '[Widget] Falha ao persistir snapshot compartilhado:', err);
  }

  // 2. Atualiza o Widget Nativo do Android (react-native-android-widget)
  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MomentusAndroidWidget } = require('@/widgets/MomentusAndroidWidget') as typeof import('@/widgets/MomentusAndroidWidget');

      await requestWidgetUpdate({
        widgetName: MOMENTUS_WIDGET_NAME,
        renderWidget: (widgetInfo) =>
          React.createElement(MomentusAndroidWidget, {
            snapshot,
            widgetHeight: widgetInfo.height,
          }),
        widgetNotFound: () => {
          // Nenhum widget adicionado na tela inicial do dispositivo ainda
        },
      });
    } catch {
      // Silencioso no Expo Go ou builds sem módulo nativo de widget
    }
    return;
  }

  // 3. Atualiza o WidgetKit Nativo do iOS (expo-widgets)
  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getMomentusIosWidget } = require('@/widgets/MomentusIosWidget') as typeof import('@/widgets/MomentusIosWidget');
      const iosWidget = getMomentusIosWidget();
      if (!iosWidget) return;

      const timeline = buildIosWidgetTimeline(
        habits,
        categories,
        currentStreak,
        primaryColor,
        isDark,
        isOled
      );
      iosWidget.updateTimeline(timeline);
    } catch {
      // Silencioso no Expo Go ou builds sem extensão WidgetKit
    }
  }
}

const recentLiveIosToggles = new Map<string, number>();

/**
 * Escuta interações diretas em botões do WidgetKit iOS enquanto o app estiver ativo em memória.
 */
export function subscribeToWidgetInteractions(
  onToggleHabitId: (habitId: string) => void
): () => void {
  if (Platform.OS !== 'ios') {
    return () => {};
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addUserInteractionListener } = require('expo-widgets') as typeof import('expo-widgets');
    const subscription = addUserInteractionListener((event) => {
      if (event.source !== MOMENTUS_WIDGET_NAME) return;
      if (typeof event.target === 'string' && event.target.startsWith('toggle:')) {
        const habitId = event.target.slice('toggle:'.length);
        if (habitId) {
          recentLiveIosToggles.set(habitId, Date.now());
          onToggleHabitId(habitId);
        }
      }
    });

    return () => {
      try {
        subscription.remove();
      } catch {
        // noop
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Reconcilia hábitos marcados/desmarcados diretamente pelo widget enquanto o app estava fechado
 * ou em segundo plano, garantindo sincronização com SQLite, XP, Streak e Firestore.
 */
export async function reconcilePendingWidgetToggles(
  onToggleHabitId: (habitId: string) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  // Android: drena fila de toggles gravados pelo handler headless
  if (Platform.OS === 'android') {
    try {
      const raw = await AsyncStorage.getItem(WIDGET_STORAGE_KEYS.PENDING_TOGGLES);
      if (!raw) return;
      const pendingIds = JSON.parse(raw) as string[];
      if (!Array.isArray(pendingIds) || pendingIds.length === 0) return;

      await AsyncStorage.removeItem(WIDGET_STORAGE_KEYS.PENDING_TOGGLES);
      pendingIds.forEach((habitId) => {
        if (typeof habitId === 'string' && habitId) {
          onToggleHabitId(habitId);
        }
      });
    } catch {
      // noop
    }
    return;
  }

  // iOS: lê timeline persistida pelo WidgetKit para detectar toggledHabitIds realizados offline
  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getMomentusIosWidget } = require('@/widgets/MomentusIosWidget') as typeof import('@/widgets/MomentusIosWidget');
      const iosWidget = getMomentusIosWidget();
      if (!iosWidget) return;

      const entries = await iosWidget.getTimeline();
      if (!Array.isArray(entries) || entries.length === 0) return;

      const now = Date.now();
      const pendingSet = new Set<string>();
      for (const entry of entries) {
        const ids = entry.props?.toggledHabitIds;
        if (Array.isArray(ids)) {
          ids.forEach((id) => {
            if (typeof id === 'string' && id) {
              const liveHandledAt = recentLiveIosToggles.get(id) ?? 0;
              if (now - liveHandledAt > 3000) {
                pendingSet.add(id);
              }
            }
          });
        }
      }

      if (pendingSet.size > 0) {
        pendingSet.forEach((habitId) => onToggleHabitId(habitId));
      }
    } catch {
      // noop
    }
  }
}

/**
 * Solicita ao launcher Android a fixação imediata do widget do Momentus na tela inicial.
 * Retorna `true` se o diálogo nativo foi exibido com sucesso.
 */
export async function requestPinAndroidWidget(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestPinWidget } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    if (typeof requestPinWidget !== 'function') {
      return false;
    }
    return await requestPinWidget({ widgetName: MOMENTUS_WIDGET_NAME });
  } catch {
    return false;
  }
}
