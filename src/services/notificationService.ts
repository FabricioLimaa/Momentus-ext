import type * as NotificationsTypes from 'expo-notifications';
import { Platform } from 'react-native';
import { HabitItem } from '@/types';
import { MomentusLog } from '@/util/logger';

export const CHANNEL_INICIO = 'CHANNEL_INICIO';
export const CHANNEL_TERMINO = 'CHANNEL_TERMINO';

export const CATEGORY_HABIT_START = 'CATEGORY_HABIT_START';
export const CATEGORY_HABIT_END = 'CATEGORY_HABIT_END';

export const ACTION_MARK_COMPLETED = 'ACTION_MARK_COMPLETED';
export const ACTION_SNOOZE_15 = 'ACTION_SNOOZE_15';

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
  addNotificationResponseReceivedListener: typeof NotificationsTypes.addNotificationResponseReceivedListener;
  DEFAULT_ACTION_IDENTIFIER: string;
  AndroidImportance: typeof NotificationsTypes.AndroidImportance;
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
    const { addNotificationResponseReceivedListener, DEFAULT_ACTION_IDENTIFIER } = require('expo-notifications/build/NotificationsEmitter');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AndroidImportance } = require('expo-notifications/build/NotificationChannelManager.types');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { IosAuthorizationStatus } = require('expo-notifications/build/NotificationPermissions.types');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SchedulableTriggerInputTypes } = require('expo-notifications/build/Notifications.types');

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
      addNotificationResponseReceivedListener,
      DEFAULT_ACTION_IDENTIFIER:
        DEFAULT_ACTION_IDENTIFIER || 'expo.modules.notifications.actions.DEFAULT',
      AndroidImportance,
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
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_TERMINO, {
      name: 'Término da Rotina',
      description: 'Notificações enviadas quando uma rotina ou hábito é finalizado',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38BDF8', // Sky/Cyan Blue
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
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

  let startNotificationId: string | undefined;
  let endNotificationId: string | undefined;

  const now = new Date();

  // 1. Agendar Início
  if (habit.timeStart) {
    const startDate = parseLocalDateTime(habit.date, habit.timeStart);
    if (startDate && startDate.getTime() > now.getTime()) {
      try {
        startNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Início: ${habit.title}`,
            body: 'Sua rotina começou! Toque para ver opções ou use os botões abaixo. 🚀',
            categoryIdentifier: CATEGORY_HABIT_START,
            data: {
              habitId: habit.id,
              habitTitle: habit.title,
              type: 'START',
            },
            sound: 'default',
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

  // 2. Agendar Término
  const endTime = habit.timeEnd || habit.timeStart;
  if (endTime) {
    const endDate = parseLocalDateTime(habit.date, endTime);
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
            sound: 'default',
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
        sound: 'default',
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
