import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';
import type { AppSettings, HabitItem } from '@/types';
import { MomentusLog } from '@/util/logger';
import { getAppKv } from '@/database/momentusDb';

export const CHANNEL_INICIO = 'CHANNEL_INICIO';
export const CHANNEL_TERMINO = 'CHANNEL_TERMINO';
// V2 garante que dispositivos Android existentes recriem o canal com lockscreenVisibility PUBLIC
export const CHANNEL_FOCUS_LIVE = 'CHANNEL_FOCUS_LIVE_V2';

export const CATEGORY_HABIT_START = 'CATEGORY_HABIT_START';
export const CATEGORY_HABIT_END = 'CATEGORY_HABIT_END';
export const CATEGORY_FOCUS_LIVE_RUNNING = 'CATEGORY_FOCUS_LIVE_RUNNING';
export const CATEGORY_FOCUS_LIVE_PAUSED = 'CATEGORY_FOCUS_LIVE_PAUSED';

export const ACTION_MARK_COMPLETED = 'ACTION_MARK_COMPLETED';
export const ACTION_SNOOZE_15 = 'ACTION_SNOOZE_15';
export const ACTION_FOCUS_PAUSE = 'ACTION_FOCUS_PAUSE';
export const ACTION_FOCUS_RESUME = 'ACTION_FOCUS_RESUME';
export const ACTION_FOCUS_SKIP = 'ACTION_FOCUS_SKIP';

export const MOMENTUS_FOCUS_LIVE_NOTIF_ID = 'momentus_focus_live_active';

type LocalNotificationsApi = {
  setNotificationHandler: typeof NotificationsTypes.setNotificationHandler;
  getPermissionsAsync: typeof NotificationsTypes.getPermissionsAsync;
  requestPermissionsAsync: typeof NotificationsTypes.requestPermissionsAsync;
  setNotificationCategoryAsync: typeof NotificationsTypes.setNotificationCategoryAsync;
  setNotificationChannelAsync: typeof NotificationsTypes.setNotificationChannelAsync;
  scheduleNotificationAsync: typeof NotificationsTypes.scheduleNotificationAsync;
  getAllScheduledNotificationsAsync: typeof NotificationsTypes.getAllScheduledNotificationsAsync;
  cancelScheduledNotificationAsync: typeof NotificationsTypes.cancelScheduledNotificationAsync;
  cancelAllScheduledNotificationsAsync: typeof NotificationsTypes.cancelAllScheduledNotificationsAsync;
  dismissNotificationAsync: typeof NotificationsTypes.dismissNotificationAsync;
  addNotificationResponseReceivedListener: typeof NotificationsTypes.addNotificationResponseReceivedListener;
  DEFAULT_ACTION_IDENTIFIER: string;
  AndroidImportance: typeof NotificationsTypes.AndroidImportance;
  AndroidNotificationVisibility: typeof NotificationsTypes.AndroidNotificationVisibility;
  AndroidNotificationPriority: typeof NotificationsTypes.AndroidNotificationPriority;
  IosAuthorizationStatus: typeof NotificationsTypes.IosAuthorizationStatus;
  SchedulableTriggerInputTypes: typeof NotificationsTypes.SchedulableTriggerInputTypes;
};

let cachedNotifications: LocalNotificationsApi | null | undefined;
let handlerConfigured = false;

/**
 * Carrega apenas os submódulos de notificações locais sob demanda e dentro de try/catch.
 * Isso evita carregar o barrel raiz 'expo-notifications/build/index.js', que importa
 * 'TopicSubscriptionModule.android.js' ('ExpoTopicSubscriptionModule') e causa crash no Expo Go.
 */
function getNotifications(): LocalNotificationsApi | null {
  if (Platform.OS === 'web') return null;
  if (cachedNotifications !== undefined) return cachedNotifications;

  try {
    // No Expo Go Android (SDK 53+), o NotificationsChannelsProvider nativo foi desativado pelo Expo
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isRunningInExpoGo } = require('expo');
    if (Platform.OS === 'android' && typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
      cachedNotifications = null;
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setNotificationHandler } = require('expo-notifications/build/NotificationsHandler');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getPermissionsAsync, requestPermissionsAsync } = require('expo-notifications/build/NotificationPermissions');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setNotificationCategoryAsync } = require('expo-notifications/build/setNotificationCategoryAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setNotificationChannelAsync } = require('expo-notifications/build/setNotificationChannelAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { scheduleNotificationAsync } = require('expo-notifications/build/scheduleNotificationAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAllScheduledNotificationsAsync } = require('expo-notifications/build/getAllScheduledNotificationsAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cancelScheduledNotificationAsync } = require('expo-notifications/build/cancelScheduledNotificationAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cancelAllScheduledNotificationsAsync } = require('expo-notifications/build/cancelAllScheduledNotificationsAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { dismissNotificationAsync } = require('expo-notifications/build/dismissNotificationAsync');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addNotificationResponseReceivedListener, DEFAULT_ACTION_IDENTIFIER } = require('expo-notifications/build/NotificationsEmitter');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AndroidImportance, AndroidNotificationVisibility } = require('expo-notifications/build/NotificationChannelManager.types');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { IosAuthorizationStatus } = require('expo-notifications/build/NotificationPermissions.types');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SchedulableTriggerInputTypes, AndroidNotificationPriority } = require('expo-notifications/build/Notifications.types');

    cachedNotifications = {
      setNotificationHandler,
      getPermissionsAsync,
      requestPermissionsAsync,
      setNotificationCategoryAsync,
      setNotificationChannelAsync,
      scheduleNotificationAsync,
      getAllScheduledNotificationsAsync,
      cancelScheduledNotificationAsync,
      cancelAllScheduledNotificationsAsync,
      dismissNotificationAsync,
      addNotificationResponseReceivedListener,
      DEFAULT_ACTION_IDENTIFIER:
        DEFAULT_ACTION_IDENTIFIER || 'expo.modules.notifications.actions.DEFAULT',
      AndroidImportance,
      AndroidNotificationVisibility,
      AndroidNotificationPriority,
      IosAuthorizationStatus,
      SchedulableTriggerInputTypes,
    };

    if (!handlerConfigured && cachedNotifications.setNotificationHandler) {
      handlerConfigured = true;
      try {
        cachedNotifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch {}
    }

    return cachedNotifications;
  } catch (err) {
    MomentusLog.notif.warn('Módulo nativo de notificações indisponível neste ambiente:', err);
    cachedNotifications = null;
    return null;
  }
}

/**
 * Inscreve listener para interações com notificações locais ("Concluir", "Adiar 15 min" ou toque padrão)
 * com fallback seguro caso o ambiente (Web ou Expo Go restrito) não suporte o módulo nativo.
 */
export function subscribeToHabitNotificationResponses(handlers: {
  onMarkCompleted: (habitId: string) => void;
  onSnooze15: (habitId: string, habitTitle: string) => void;
  onDefaultTap: (habitId: string, habitTitle: string) => void;
}): () => void {
  const Notifications = getNotifications();
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as {
        habitId?: string;
        habitTitle?: string;
      };
      const habitId = data?.habitId;
      const habitTitle =
        data?.habitTitle ||
        response.notification.request.content.title?.replace(/^(Início|Término):\s*/i, '') ||
        'Sua Rotina';

      if (!habitId) return;

      if (actionId === ACTION_MARK_COMPLETED) {
        handlers.onMarkCompleted(habitId);
      } else if (actionId === ACTION_SNOOZE_15) {
        handlers.onSnooze15(habitId, habitTitle);
      } else if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        handlers.onDefaultTap(habitId, habitTitle);
      }
    });

    return () => {
      try {
        subscription.remove();
      } catch {}
    };
  } catch {
    return () => {};
  }
}

/**
 * Configura categorias interativas ("Concluir" e "Adiar 15 min") e canais no Android
 * equivalentes ao AlarmReceiver.kt e NotificationActionReceiver.kt do projeto nativo.
 */
export async function setupNotificationChannels(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.setNotificationCategoryAsync(CATEGORY_HABIT_START, [
      {
        identifier: ACTION_MARK_COMPLETED,
        buttonTitle: 'Concluir ✅',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: ACTION_SNOOZE_15,
        buttonTitle: 'Adiar 15 min ⏰',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(CATEGORY_HABIT_END, [
      {
        identifier: ACTION_MARK_COMPLETED,
        buttonTitle: 'Concluir ✅',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(CATEGORY_FOCUS_LIVE_RUNNING, [
      {
        identifier: ACTION_FOCUS_PAUSE,
        buttonTitle: 'Pausar ⏸',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_FOCUS_SKIP,
        buttonTitle: 'Pular ⏭',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(CATEGORY_FOCUS_LIVE_PAUSED, [
      {
        identifier: ACTION_FOCUS_RESUME,
        buttonTitle: 'Retomar ▶',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_FOCUS_SKIP,
        buttonTitle: 'Pular ⏭',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (err) {
    MomentusLog.notif.warn('Erro ao configurar categorias interativas de notificação:', err);
  }

  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_INICIO, {
      name: 'Início da Rotina',
      description: 'Notificações enviadas quando uma rotina ou hábito se inicia',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34D399', // Emerald Neon
      enableLights: true,
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_TERMINO, {
      name: 'Término da Rotina',
      description: 'Notificações enviadas quando uma rotina ou hábito é finalizado',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38BDF8', // Sky/Cyan Blue
      enableLights: true,
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_FOCUS_LIVE, {
      name: 'Modo Foco Ativo (Tela Bloqueada)',
      description: 'Notificação persistente visível na tela bloqueada com controles do Pomodoro',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: '#34D399',
      sound: null,
      enableLights: false,
      enableVibrate: false,
      showBadge: false,
    });
  } catch (error) {
    MomentusLog.notif.warn('Erro ao configurar canais de notificação:', error);
  }
}

/**
 * Solicita permissões de notificação ao usuário.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted =
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    if (!granted) {
      const request = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      granted =
        request.granted ||
        request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        request.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    }

    if (granted) {
      await setupNotificationChannels();
    }

    return granted;
  } catch (error) {
    MomentusLog.notif.warn('Erro ao solicitar permissões de notificação:', error);
    return false;
  }
}

/**
 * Converte data (YYYY-MM-DD) e horário (HH:mm) para objeto Date local.
 */
function parseLocalDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      return null;
    }

    // Criar com horário local do dispositivo
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  } catch {
    return null;
  }
}

/**
 * Agenda os alarmes de início e término de um hábito, espelhando fielmente
 * o comportamento do AlarmScheduler e AlarmReceiver do Android.
 */
export async function scheduleHabitNotifications(
  habit: HabitItem
): Promise<{ startNotificationId?: string; endNotificationId?: string }> {
  const Notifications = getNotifications();
  if (!Notifications || habit.completed) {
    return {};
  }

  const appSettings = await getAppKv<AppSettings>('app_settings').catch(() => null);
  if (appSettings?.notificationsEnabled === false) {
    return {};
  }
  const advanceMinutes = Math.max(0, Number(appSettings?.reminderAdvanceMinutes ?? 0) || 0);

  let startNotificationId: string | undefined;
  let endNotificationId: string | undefined;

  const now = new Date();

  // 1. Agendar Início (respeitando antecedência configurada em Ajustes)
  if (habit.timeStart) {
    const rawStartDate = parseLocalDateTime(habit.date, habit.timeStart);
    const startDate = rawStartDate
      ? new Date(rawStartDate.getTime() - advanceMinutes * 60 * 1000)
      : null;
    if (startDate && startDate.getTime() > now.getTime()) {
      try {
        startNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Início: ${habit.title}`,
            body:
              advanceMinutes > 0
                ? `Sua rotina começa em ${advanceMinutes} min! Prepare-se para entrar no ritmo. 🚀`
                : 'Sua rotina começou! Toque para ver opções ou use os botões abaixo. 🚀',
            categoryIdentifier: CATEGORY_HABIT_START,
            data: {
              habitId: habit.id,
              habitTitle: habit.title,
              type: 'START',
            },
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_INICIO } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: startDate,
          },
        });
      } catch (err) {
        MomentusLog.notif.warn(`Erro ao agendar notificação de início para "${habit.title}":`, err);
      }
    }
  }

  // 2. Agendar Término somente quando há timeEnd distinto de timeStart (evita disparo duplo no mesmo segundo)
  const hasDistinctEnd = Boolean(habit.timeEnd && habit.timeEnd !== habit.timeStart);
  if (hasDistinctEnd && habit.timeEnd) {
    const endDate = parseLocalDateTime(habit.date, habit.timeEnd);
    if (endDate && endDate.getTime() > now.getTime()) {
      try {
        endNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Término: ${habit.title}`,
            body: 'Hora de finalizar sua rotina. Como foi seu progresso? ✅',
            categoryIdentifier: CATEGORY_HABIT_END,
            data: {
              habitId: habit.id,
              habitTitle: habit.title,
              type: 'END',
            },
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_TERMINO } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: endDate,
          },
        });
      } catch (err) {
        MomentusLog.notif.warn(`Erro ao agendar notificação de término para "${habit.title}":`, err);
      }
    }
  }

  return { startNotificationId, endNotificationId };
}

const MORNING_BRIEFING_ID = 'momentus_daily_morning_briefing';
const EVENING_REFLECTION_ID = 'momentus_daily_evening_reflection';

/**
 * Sincroniza os lembretes recorrentes de Briefing Matinal (08:00) e Reflexão Noturna (21:00)
 * com as preferências salvas em Ajustes.
 */
export async function syncDailyBriefingNotifications(settings: Partial<AppSettings>): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_BRIEFING_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(EVENING_REFLECTION_ID).catch(() => {});

    if (settings.notificationsEnabled === false) {
      return;
    }

    if (settings.morningBriefingEnabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: MORNING_BRIEFING_ID,
        content: {
          title: 'Bom dia! Suas rotinas de hoje ☀️',
          body: 'Confira o que está planejado para o seu dia e comece com foco.',
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_INICIO } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 0,
        },
      }).catch(() => {});
    }

    if (settings.eveningReflectionEnabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: EVENING_REFLECTION_ID,
        content: {
          title: 'Fechamento do Dia 🌙',
          body: 'Revise seus hábitos concluídos e preserve sua sequência antes de descansar.',
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_TERMINO } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 21,
          minute: 0,
        },
      }).catch(() => {});
    }
  } catch (err) {
    MomentusLog.notif.warn('Erro ao sincronizar lembretes diários:', err);
  }
}

/**
 * Adia o lembrete de uma rotina por X minutos (padrão: 15 min),
 * espelhando a ação ACTION_SNOOZE do NotificationActionReceiver.kt e ReminderActivity.kt.
 */
export async function snoozeHabitNotification(
  habitId: string,
  habitTitle: string,
  minutes: number = 15
): Promise<string | undefined> {
  const Notifications = getNotifications();
  if (!Notifications) return undefined;

  try {
    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Início: ${habitTitle}`,
        body: `Lembrete adiado (${minutes} min). Sua rotina começa agora! 🚀`,
        categoryIdentifier: CATEGORY_HABIT_START,
        data: {
          habitId,
          habitTitle,
          type: 'START',
        },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_INICIO } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
      },
    });
  } catch (error) {
    MomentusLog.notif.warn(`Erro ao adiar notificação do hábito ${habitId}:`, error);
    return undefined;
  }
}

/**
 * Cancela notificações agendadas vinculadas a um hábito (via ID ou payload).
 */
export async function cancelHabitNotifications(habitId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data?.habitId === habitId) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    MomentusLog.notif.warn(`Erro ao cancelar notificações para o hábito ${habitId}:`, error);
  }
}

/**
 * Cancela todas as notificações agendadas no aplicativo.
 */
export async function cancelAllNotifications(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    MomentusLog.notif.warn('Erro ao cancelar todas as notificações:', error);
  }
}

/**
 * Agenda uma notificação local precisa para quando um ciclo de foco ou pausa terminar.
 */
export async function scheduleFocusNotification(
  seconds: number,
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK',
  habitTitle?: string
): Promise<string | undefined> {
  const Notifications = getNotifications();
  if (!Notifications || seconds <= 0) return undefined;

  try {
    const targetDate = new Date(Date.now() + seconds * 1000);
    const isFocus = mode === 'FOCUS';
    const title = isFocus
      ? 'Sessão de Foco Concluída! 🎯'
      : mode === 'SHORT_BREAK'
      ? 'Pausa Curta Finalizada! ⚡'
      : 'Pausa Longa Finalizada! 🔋';

    const body = isFocus
      ? habitTitle
        ? `Parabéns! Você completou sua sessão no hábito "${habitTitle}". XP computado!`
        : 'Parabéns! Você completou seu ciclo de foco. Hora de descansar um pouco!'
      : 'Hora de retomar as atividades com foco total!';

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_TERMINO } : {}),
        data: {
          type: 'FOCUS_TIMER_FINISHED',
          mode,
          habitTitle,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
  } catch (error) {
    MomentusLog.notif.warn('Erro ao agendar notificação de foco:', error);
    return undefined;
  }
}

/**
 * Cancela a notificação de foco agendada (por id ou limpando todas as do tipo).
 */
export async function cancelFocusNotification(notificationId?: string | null): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return;
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data?.type === 'FOCUS_TIMER_FINISHED') {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    MomentusLog.notif.warn('Erro ao cancelar notificação de foco:', error);
  }
}

/**
 * Exibe ou atualiza a notificação persistente de alta prioridade do Modo Foco no Android
 * com controles interativos (Pausar/Retomar e Pular).
 */
export async function presentPersistentFocusNotification(params: {
  title: string;
  body: string;
  subtitle?: string;
  color?: string;
  isRunning: boolean;
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
}): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await setupNotificationChannels();
    await Notifications.scheduleNotificationAsync({
      identifier: MOMENTUS_FOCUS_LIVE_NOTIF_ID,
      content: {
        title: params.title,
        subtitle: params.subtitle,
        body: params.body,
        color: params.color || '#34D399',
        sticky: true,
        autoDismiss: false,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: params.isRunning
          ? CATEGORY_FOCUS_LIVE_RUNNING
          : CATEGORY_FOCUS_LIVE_PAUSED,
        data: {
          type: 'FOCUS_LIVE_PERSISTENT',
          mode: params.mode,
          isRunning: params.isRunning,
        },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_FOCUS_LIVE } : {}),
      },
      trigger: null,
    });
  } catch (error) {
    MomentusLog.notif.warn('Erro ao exibir notificação persistente de foco:', error);
  }
}

/**
 * Remove a notificação persistente de foco da barra do Android.
 */
export async function dismissPersistentFocusNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.dismissNotificationAsync(MOMENTUS_FOCUS_LIVE_NOTIF_ID);
  } catch {}
  try {
    await Notifications.cancelScheduledNotificationAsync(MOMENTUS_FOCUS_LIVE_NOTIF_ID);
  } catch {}
}

/**
 * Escuta ações dos botões de reprodução (Pausar, Retomar, Pular) na notificação persistente do Android.
 */
export function subscribeToFocusLiveNotificationActions(handlers: {
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
}): () => void {
  if (Platform.OS !== 'android') return () => {};
  const Notifications = getNotifications();
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return () => {};
  }

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as { type?: string } | undefined;
      if (data?.type !== 'FOCUS_LIVE_PERSISTENT') return;

      if (actionId === ACTION_FOCUS_PAUSE) {
        handlers.onPause();
      } else if (actionId === ACTION_FOCUS_RESUME) {
        handlers.onResume();
      } else if (actionId === ACTION_FOCUS_SKIP) {
        handlers.onSkip();
      }
    });

    return () => {
      try {
        subscription.remove();
      } catch {}
    };
  } catch {
    return () => {};
  }
}
