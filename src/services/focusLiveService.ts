import { Platform } from 'react-native';
import type { LiveActivity } from 'expo-widgets';
import {
  MOMENTUS_FOCUS_LIVE_ACTIVITY_NAME,
  getMomentusFocusLiveActivity,
  type FocusLiveActivityProps,
} from '@/widgets/MomentusFocusLiveActivity';
import {
  presentPersistentFocusNotification,
  dismissPersistentFocusNotification,
  subscribeToFocusLiveNotificationActions,
} from '@/services/notificationService';

export interface FocusLiveSyncState {
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  habitTitle?: string | null;
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  endTimestampMs?: number | null;
  accentColor: string;
  isOled?: boolean;
}

let activeIosActivity: LiveActivity<FocusLiveActivityProps> | null = null;
let lastAndroidSyncMinuteKey = '';

function formatClockMmSs(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatEndHourMin(endMs: number): string {
  const d = new Date(endMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getModeDisplayLabel(mode: FocusLiveSyncState['mode']): string {
  switch (mode) {
    case 'FOCUS':
      return 'Foco Profundo';
    case 'SHORT_BREAK':
      return 'Pausa Curta';
    case 'LONG_BREAK':
      return 'Pausa Longa';
  }
}

/**
 * Inicia ou atualiza o acompanhamento ao vivo do timer Pomodoro:
 * - iOS: Live Activity na Tela de Bloqueio + Dynamic Island com contagem nativa
 * - Android: Notificação persistente de alta prioridade com botões Pausar/Retomar e Pular
 * - Web: Título dinâmico da aba do navegador (⏱️ MM:SS • Momentus)
 */
export async function syncFocusLiveActivity(
  state: FocusLiveSyncState,
  options?: { forceAndroidRefresh?: boolean }
): Promise<void> {
  const modeLabel = getModeDisplayLabel(state.mode);
  const habitTitle = state.habitTitle?.trim() || 'Sessão Pomodoro';
  const remainingFormatted = formatClockMmSs(state.remainingSeconds);
  const safeTotal = Math.max(1, state.totalSeconds);
  const elapsedSeconds = Math.max(0, safeTotal - state.remainingSeconds);
  const progress = Math.max(0, Math.min(1, elapsedSeconds / safeTotal));
  const now = Date.now();
  const effectiveEndMs =
    state.isRunning && state.endTimestampMs && state.endTimestampMs > now
      ? state.endTimestampMs
      : now + Math.max(1, state.remainingSeconds) * 1000;
  const effectiveStartMs = effectiveEndMs - safeTotal * 1000;

  // 1. Web: exibe contagem discreta no título da aba
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.title = state.isRunning
        ? `⏱️ ${remainingFormatted} • ${modeLabel} | Momentus`
        : `⏸️ ${remainingFormatted} • ${modeLabel} | Momentus`;
    }
    return;
  }

  // 2. iOS: Live Activity & Dynamic Island (ActivityKit via expo-widgets)
  if (Platform.OS === 'ios') {
    const factory = getMomentusFocusLiveActivity();
    if (!factory) return;

    const props: FocusLiveActivityProps = {
      mode: state.mode,
      modeLabel,
      habitTitle,
      isRunning: state.isRunning,
      startTimestampMs: effectiveStartMs,
      endTimestampMs: effectiveEndMs,
      remainingFormatted,
      progress,
      accentColor: state.accentColor || '#34D399',
      isOled: state.isOled === true,
    };

    try {
      const staleDate = new Date(effectiveEndMs + 60 * 1000);
      if (!activeIosActivity) {
        const existing = factory.getInstances();
        if (existing.length > 0) {
          activeIosActivity = existing[0];
          // Encerra instâncias excedentes caso tenham ficado órfãs
          for (let i = 1; i < existing.length; i++) {
            existing[i].end('immediate').catch(() => {});
          }
        }
      }

      if (activeIosActivity) {
        await activeIosActivity.update(props, staleDate);
      } else {
        activeIosActivity = factory.start(props, 'momentus://focus', staleDate);
      }
    } catch {
      activeIosActivity = null;
    }
    return;
  }

  // 3. Android: Notificação persistente de alta prioridade com controles de reprodução
  if (Platform.OS === 'android') {
    const remainingMinutesCeil = Math.max(1, Math.ceil(state.remainingSeconds / 60));
    const syncKey = `${state.mode}|${state.isRunning}|${remainingMinutesCeil}|${habitTitle}`;

    if (!options?.forceAndroidRefresh && syncKey === lastAndroidSyncMinuteKey) {
      return;
    }
    lastAndroidSyncMinuteKey = syncKey;

    const emoji = !state.isRunning ? '⏸️' : state.mode === 'FOCUS' ? '⏱️' : '🌿';
    const title = state.isRunning
      ? `${emoji} ${modeLabel} • ${remainingFormatted}`
      : `${emoji} ${modeLabel} (Pausado • ${remainingFormatted})`;

    const body = state.isRunning
      ? `${habitTitle} • Termina às ${formatEndHourMin(effectiveEndMs)}`
      : `${habitTitle} • Toque em Retomar para continuar`;

    await presentPersistentFocusNotification({
      title,
      body,
      isRunning: state.isRunning,
      mode: state.mode,
    });
  }
}

/**
 * Encerra a Live Activity (iOS), dispensa a notificação persistente (Android)
 * e restaura o título da aba (Web).
 */
export async function endFocusLiveActivity(): Promise<void> {
  lastAndroidSyncMinuteKey = '';

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.title = 'Momentus';
    }
    return;
  }

  if (Platform.OS === 'ios') {
    try {
      if (activeIosActivity) {
        await activeIosActivity.end('immediate');
        activeIosActivity = null;
      }
      const factory = getMomentusFocusLiveActivity();
      if (factory) {
        const instances = factory.getInstances();
        await Promise.all(instances.map((inst) => inst.end('immediate').catch(() => {})));
      }
    } catch {
      activeIosActivity = null;
    }
    return;
  }

  if (Platform.OS === 'android') {
    await dismissPersistentFocusNotification();
  }
}

/**
 * Inscreve listener unificado para os botões interativos de Pausar, Retomar e Pular
 * disparados da Dynamic Island / Tela de Bloqueio (iOS) ou da Notificação Persistente (Android).
 */
export function subscribeToFocusLiveActions(handlers: {
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
}): () => void {
  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addUserInteractionListener } = require('expo-widgets') as typeof import('expo-widgets');
      const sub = addUserInteractionListener((event) => {
        if (event.source !== MOMENTUS_FOCUS_LIVE_ACTIVITY_NAME) return;
        if (event.target === 'focus_pause') {
          handlers.onPause();
        } else if (event.target === 'focus_resume') {
          handlers.onResume();
        } else if (event.target === 'focus_skip') {
          handlers.onSkip();
        }
      });

      return () => {
        try {
          sub.remove();
        } catch {}
      };
    } catch {
      return () => {};
    }
  }

  if (Platform.OS === 'android') {
    return subscribeToFocusLiveNotificationActions(handlers);
  }

  return () => {};
}
