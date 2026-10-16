import type * as LegacyCalendarTypes from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import { HabitItem, Category } from '@/types';

export const MOMENTUS_CALENDAR_TITLE = 'Momentus - Rotinas';

type LegacyCalendarModule = typeof LegacyCalendarTypes;
let cachedCalendarModule: LegacyCalendarModule | null | undefined;

/**
 * Utiliza a API estável 'expo-calendar/legacy' ('ExpoCalendar'),
 * que funciona tanto em Development Builds quanto no Expo Go (diferente do CalendarNext,
 * que possui apenas um stub inativo no Expo Go).
 */
function getCalendarModule(): LegacyCalendarModule | null {
  if (Platform.OS === 'web') return null;
  if (cachedCalendarModule !== undefined) return cachedCalendarModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedCalendarModule = require('expo-calendar/legacy') as LegacyCalendarModule;
    return cachedCalendarModule;
  } catch (err) {
    console.warn('Módulo nativo expo-calendar indisponível neste ambiente:', err);
    cachedCalendarModule = null;
    return null;
  }
}

/**
 * Solicita permissões de leitura e gravação no calendário do sistema.
 */
export async function requestDeviceCalendarPermissions(): Promise<boolean> {
  const Calendar = getCalendarModule();
  if (!Calendar?.requestCalendarPermissionsAsync) return false;
  try {
    const res = await Calendar.requestCalendarPermissionsAsync();
    return res.granted;
  } catch (error) {
    console.warn('Erro ao solicitar permissões de calendário:', error);
    return false;
  }
}

/**
 * Obtém o ID do calendário exclusivo do Momentus ou local padrão que aceite modificações.
 */
export async function getOrCreateMomentusCalendarId(): Promise<string | null> {
  const Calendar = getCalendarModule();
  if (!Calendar?.getCalendarsAsync) return null;

  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes?.EVENT);
    if (!calendars || calendars.length === 0) {
      return null;
    }

    // 1. Procura se já existe um calendário "Momentus - Rotinas"
    const existingMomentus = calendars.find(
      (c) => c.title === MOMENTUS_CALENDAR_TITLE && c.allowsModifications
    );
    if (existingMomentus) {
      return existingMomentus.id;
    }

    // 2. Se for Android, tentamos usar o primário gravável ou criar um calendário local
    if (Platform.OS === 'android') {
      const primaryWritable = calendars.find((c) => c.isPrimary && c.allowsModifications);
      if (primaryWritable) {
        return primaryWritable.id;
      }

      try {
        const createdId = await Calendar.createCalendarAsync({
          title: MOMENTUS_CALENDAR_TITLE,
          color: '#34D399',
          entityType: Calendar.EntityTypes?.EVENT,
          name: 'MomentusCalendar',
          ownerAccount: 'personal',
          accessLevel: Calendar.CalendarAccessLevel?.OWNER,
          source: {
            isLocalAccount: true,
            name: 'Momentus',
            type: 'LOCAL',
          },
        });
        if (createdId) return createdId;
      } catch {}
    }

    // 3. Fallback: qualquer calendário gravável no dispositivo
    const anyWritable = calendars.find((c) => c.allowsModifications);
    return anyWritable?.id || calendars[0]?.id || null;
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
 * Formata Date para padrão iCalendar UTC/Local (YYYYMMDDTHHMMSS) para exportação Web (.ics).
 */
function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T` +
    `${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

/**
 * Sincroniza um hábito para o calendário nativo (Google Calendar no Android / Apple Calendar no iOS).
 * Retorna o ID do evento criado ou atualizado.
 */
export async function syncHabitToDeviceCalendar(
  habit: HabitItem,
  category?: Category
): Promise<string | null> {
  const Calendar = getCalendarModule();
  if (!Calendar) return null;

  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return null;

    const calendarId = await getOrCreateMomentusCalendarId();
    if (!calendarId) return null;

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
        const updatedId = await Calendar.updateEventAsync(habit.googleCalendarEventId, {
          title: habit.title,
          startDate,
          endDate,
          notes,
        });
        if (updatedId) return updatedId;
      } catch {
        // Evento pode ter sido apagado no app de calendário externo, criará um novo a seguir
      }
    }

    // Cria novo evento
    const newEventId = await Calendar.createEventAsync(calendarId, {
      title: habit.title,
      startDate,
      endDate,
      notes,
      allDay: false,
    });

    return newEventId;
  } catch (error) {
    console.warn(`Erro ao sincronizar hábito "${habit.title}" com o calendário nativo:`, error);
    return null;
  }
}

/**
 * Remove um evento do calendário nativo do dispositivo.
 */
export async function deleteHabitFromDeviceCalendar(calendarEventId: string): Promise<void> {
  if (!calendarEventId || Platform.OS === 'web') return;
  const Calendar = getCalendarModule();
  if (!Calendar?.deleteEventAsync) return;

  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return;

    await Calendar.deleteEventAsync(calendarEventId);
  } catch {}
}

/**
 * Sincroniza em lote todos os hábitos marcados com saveToGoogle ou todos os hábitos ativos.
 * Na Web, exporta automaticamente um arquivo .ics compatível com Google Calendar / Apple Calendar / Outlook.
 */
export async function syncAllHabitsToCalendar(
  habits: HabitItem[],
  categories: Category[]
): Promise<{ syncedCount: number; updatedHabits: HabitItem[] }> {
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

  // Suporte Web: gera e baixa arquivo .ics padrão para importação direta no Google/Apple Calendar
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const activeHabits = habits.filter((h) => h.saveToGoogle || !h.completed);
    if (activeHabits.length === 0) {
      return { syncedCount: 0, updatedHabits: habits };
    }

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Momentus//Rotinas//PT',
      'CALSCALE:GREGORIAN',
    ];

    for (const habit of activeHabits) {
      const startDate = parseLocalDateTime(habit.date, habit.timeStart);
      let endDate = parseLocalDateTime(habit.date, habit.timeEnd || habit.timeStart);
      if (endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      }
      const cat = categoryMap.get(habit.categoryId);
      const desc = [habit.description || '', cat ? `Categoria: ${cat.name}` : '']
        .filter(Boolean)
        .join(' - ');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${habit.id}@momentus.app`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(startDate)}`,
        `DTEND:${formatIcsDate(endDate)}`,
        `SUMMARY:${habit.title}`,
        `DESCRIPTION:${desc}`,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'momentus_agenda.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      syncedCount: activeHabits.length,
      updatedHabits: habits.map((h) =>
        h.saveToGoogle || !h.completed ? { ...h, saveToGoogle: true } : h
      ),
    };
  }

  const hasPermission = await requestDeviceCalendarPermissions();
  if (!hasPermission) {
    return { syncedCount: 0, updatedHabits: habits };
  }

  let count = 0;
  const updatedHabits: HabitItem[] = [];

  for (const habit of habits) {
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
