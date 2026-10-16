import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HabitItem } from '@/types';

// Configuração do comportamento da notificação enquanto o app estiver em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const CHANNEL_INICIO = 'CHANNEL_INICIO';
export const CHANNEL_TERMINO = 'CHANNEL_TERMINO';

/**
 * Configura canais de notificação no Android com alta prioridade e luzes customizadas
 * equivalentes ao AlarmReceiver.kt do projeto nativo.
 */
export async function setupNotificationChannels(): Promise<void> {
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
    console.warn('Erro ao configurar canais de notificação:', error);
  }
}

/**
 * Solicita permissões de notificação ao usuário.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
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
    console.warn('Erro ao solicitar permissões de notificação:', error);
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
  // Se o hábito já foi concluído, não deve agendar
  if (habit.completed) {
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
            body: 'Sua rotina começou! 🚀',
            data: {
              habitId: habit.id,
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
        console.warn(`Erro ao agendar notificação de início para "${habit.title}":`, err);
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
            data: {
              habitId: habit.id,
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
        console.warn(`Erro ao agendar notificação de término para "${habit.title}":`, err);
      }
    }
  }

  return { startNotificationId, endNotificationId };
}

/**
 * Cancela notificações agendadas vinculadas a um hábito (via ID ou payload).
 */
export async function cancelHabitNotifications(habitId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content.data?.habitId === habitId) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (error) {
    console.warn(`Erro ao cancelar notificações para o hábito ${habitId}:`, error);
  }
}

/**
 * Cancela todas as notificações agendadas no aplicativo.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('Erro ao cancelar todas as notificações:', error);
  }
}
