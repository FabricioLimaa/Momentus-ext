import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { MomentusAndroidWidget } from './MomentusAndroidWidget';
import {
  MOMENTUS_WIDGET_NAME,
  WIDGET_STORAGE_KEYS,
  type MomentusWidgetSnapshot,
} from './types';

function createEmptySnapshot(): MomentusWidgetSnapshot {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    dateLabel: 'Hoje',
    updatedAt: `${hh}:${mm}`,
    currentStreak: 0,
    completedCount: 0,
    totalCount: 0,
    progress: 0,
    primaryColor: '#34D399',
    isDark: true,
    tasks: [],
    toggledHabitIds: [],
  };
}

async function readSavedSnapshot(): Promise<MomentusWidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_STORAGE_KEYS.SNAPSHOT);
    if (!raw) return createEmptySnapshot();
    const parsed = JSON.parse(raw) as MomentusWidgetSnapshot;
    return parsed && Array.isArray(parsed.tasks) ? parsed : createEmptySnapshot();
  } catch {
    return createEmptySnapshot();
  }
}

async function toggleHabitInWidgetStorage(habitId: string): Promise<MomentusWidgetSnapshot> {
  const snapshot = await readSavedSnapshot();
  const target = snapshot.tasks.find((t) => t.id === habitId);
  if (!target) {
    return snapshot;
  }

  const nextCompletedFlag = !target.completed;
  const delta = nextCompletedFlag ? 1 : -1;
  const nextCompletedCount = Math.max(
    0,
    Math.min(snapshot.totalCount, snapshot.completedCount + delta)
  );
  const nextProgress =
    snapshot.totalCount > 0
      ? Math.max(0, Math.min(1, nextCompletedCount / snapshot.totalCount))
      : 0;

  const updatedSnapshot: MomentusWidgetSnapshot = {
    ...snapshot,
    completedCount: nextCompletedCount,
    progress: nextProgress,
    tasks: snapshot.tasks.map((t) =>
      t.id === habitId ? { ...t, completed: nextCompletedFlag } : t
    ),
  };

  try {
    await AsyncStorage.setItem(
      WIDGET_STORAGE_KEYS.SNAPSHOT,
      JSON.stringify(updatedSnapshot)
    );

    // Enfileira o toggle para reconciliação completa (XP, Streak e Firestore) ao abrir o app
    const rawPending = await AsyncStorage.getItem(WIDGET_STORAGE_KEYS.PENDING_TOGGLES);
    const pendingList: string[] = rawPending ? (JSON.parse(rawPending) as string[]) : [];
    const nextPending = pendingList.includes(habitId)
      ? pendingList.filter((id) => id !== habitId)
      : [...pendingList, habitId];

    await AsyncStorage.setItem(
      WIDGET_STORAGE_KEYS.PENDING_TOGGLES,
      JSON.stringify(nextPending)
    );
  } catch {
    // Mantém atualização visual do widget mesmo se o storage oscilar
  }

  return updatedSnapshot;
}

/**
 * Handler headless de background do Widget Android (react-native-android-widget).
 * Responde a criação, atualização periódica, redimensionamento e check rápido em 1 toque.
 */
export async function momentusWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetInfo.widgetName !== MOMENTUS_WIDGET_NAME) {
    return;
  }

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = await readSavedSnapshot();
      renderWidget(
        <MomentusAndroidWidget snapshot={snapshot} widgetHeight={widgetInfo.height} />
      );
      break;
    }

    case 'WIDGET_CLICK': {
      if (clickAction === 'TOGGLE_HABIT') {
        const habitId =
          typeof clickActionData?.habitId === 'string' ? clickActionData.habitId : null;
        const snapshot = habitId
          ? await toggleHabitInWidgetStorage(habitId)
          : await readSavedSnapshot();

        renderWidget(
          <MomentusAndroidWidget snapshot={snapshot} widgetHeight={widgetInfo.height} />
        );
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
