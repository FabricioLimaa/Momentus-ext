import {
  getCalendars,
  requestCalendarPermissions,
  createCalendar,
  ExpoCalendar,
  ExpoCalendarEvent,
  EntityTypes,
  CalendarAccessLevel,
} from 'expo-calendar';
import { Platform } from 'react-native';
import { HabitItem, Category } from '@/types';

export const MOMENTUS_CALENDAR_TITLE = 'Momentus - Rotinas';

/**
 * Solicita permissões de leitura e gravação no calendário do sistema.
 */
export async function requestDeviceCalendarPermissions(): Promise<boolean> {
  try {
    const res = await requestCalendarPermissions();
    return res.granted;
  } catch (error) {
    console.warn('Erro ao solicitar permissões de calendário:', error);
    return false;
  }
}

/**
 * Obtém ou cria o calendário exclusivo do Momentus ou local padrão que aceite modificações.
 */
export async function getOrCreateMomentusCalendar(): Promise<ExpoCalendar | null> {
  try {
    const calendars = await getCalendars(EntityTypes.EVENT);
    if (!calendars || calendars.length === 0) {
      return null;
    }

    // 1. Procura se já existe um calendário "Momentus - Rotinas"
    const existingMomentus = calendars.find(
      (c) => c.title === MOMENTUS_CALENDAR_TITLE && c.allowsModifications
    );
    if (existingMomentus) {
      return existingMomentus;
    }

    // 2. Se for Android, tentamos criar um calendário local ou usar o primário gravável
    if (Platform.OS === 'android') {
      const primaryWritable = calendars.find((c) => c.isPrimary && c.allowsModifications);
      if (primaryWritable) {
        return primaryWritable;
      }

      // Tenta criar um calendário local para o Momentus
      try {
        const created = await createCalendar({
          title: MOMENTUS_CALENDAR_TITLE,
          color: '#34D399',
          entityType: EntityTypes.EVENT,
          name: 'MomentusCalendar',
          ownerAccount: 'personal',
          accessLevel: CalendarAccessLevel.OWNER,
          source: {
            isLocalAccount: true,
            name: 'Momentus',
            type: 'LOCAL',
          },
        });
        if (created) return created;
      } catch (e) {
        console.warn('Não foi possível criar calendário dedicado no Android, usando fallback:', e);
      }
    }

    // 3. Fallback: qualquer calendário gravável no dispositivo
    const anyWritable = calendars.find((c) => c.allowsModifications);
    return anyWritable || calendars[0] || null;
  } catch (error) {
    console.warn('Erro ao obter calendário:', error);
    return null;
  }
}

/**
 * Converte data (YYYY-MM-DD) e horário (HH:mm) para objeto Date local.
 */
function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (timeStr || '08:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
}

/**
 * Sincroniza um hábito para o calendário nativo (Google Calendar no Android / Apple Calendar no iOS).
 * Retorna o ID do evento criado ou atualizado.
 */
export async function syncHabitToDeviceCalendar(
  habit: HabitItem,
  category?: Category
): Promise<string | null> {
  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return null;

    const calendar = await getOrCreateMomentusCalendar();
    if (!calendar) return null;

    const startDate = parseLocalDateTime(habit.date, habit.timeStart);
    let endDate = parseLocalDateTime(habit.date, habit.timeEnd || habit.timeStart);

    // Se a data final for menor ou igual à inicial, define duração padrão de 30 minutos
    if (endDate.getTime() <= startDate.getTime()) {
      endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    }

    const notes = [
      habit.description || '',
      category ? `Categoria: ${category.name}` : '',
      'Gerenciado pelo aplicativo Momentus ✨',
    ]
      .filter(Boolean)
      .join('\n');

    // Se já possui googleCalendarEventId, tenta atualizar o evento existente
    if (habit.googleCalendarEventId) {
      try {
        const existingEvent = await ExpoCalendarEvent.get(habit.googleCalendarEventId);
        if (existingEvent) {
          await existingEvent.update({
            title: habit.title,
            startDate,
            endDate,
            notes,
          });
          return existingEvent.id;
        }
      } catch {
        // Evento pode ter sido apagado no app de calendário externo, criará um novo a seguir
      }
    }

    // Cria novo evento
    const newEvent = await calendar.createEvent({
      title: habit.title,
      startDate,
      endDate,
      notes,
      allDay: false,
    });

    return newEvent.id;
  } catch (error) {
    console.warn(`Erro ao sincronizar hábito "${habit.title}" com o calendário nativo:`, error);
    return null;
  }
}

/**
 * Remove um evento do calendário nativo do dispositivo.
 */
export async function deleteHabitFromDeviceCalendar(calendarEventId: string): Promise<void> {
  if (!calendarEventId) return;
  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return;

    const event = await ExpoCalendarEvent.get(calendarEventId);
    if (event) {
      await event.delete();
    }
  } catch (error) {
    console.warn(`Erro ao remover evento ${calendarEventId} do calendário:`, error);
  }
}

/**
 * Sincroniza em lote todos os hábitos marcados com saveToGoogle ou todos os hábitos ativos.
 */
export async function syncAllHabitsToCalendar(
  habits: HabitItem[],
  categories: Category[]
): Promise<{ syncedCount: number; updatedHabits: HabitItem[] }> {
  const hasPermission = await requestDeviceCalendarPermissions();
  if (!hasPermission) {
    return { syncedCount: 0, updatedHabits: habits };
  }

  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  let count = 0;

  const updatedHabits: HabitItem[] = [];

  for (const habit of habits) {
    // Sincroniza hábitos com saveToGoogle ativado ou tarefas pendentes
    if (habit.saveToGoogle || !habit.completed) {
      const eventId = await syncHabitToDeviceCalendar(habit, categoryMap.get(habit.categoryId));
      if (eventId) {
        count++;
        updatedHabits.push({
          ...habit,
          googleCalendarEventId: eventId,
          saveToGoogle: true,
        });
        continue;
      }
    }
    updatedHabits.push(habit);
  }

  return { syncedCount: count, updatedHabits };
}
