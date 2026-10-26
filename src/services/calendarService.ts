import type * as LegacyCalendarTypes from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import { HabitItem, Category } from '@/types';
import { getGoogleCalendarAccessToken } from '@/services/authService';
import { MomentusLog } from '@/util/logger';

export const MOMENTUS_CALENDAR_TITLE = 'Momentus - Rotinas';

export interface GoogleCalendarEventItem {
  id: string;
  title: string;
  startDateTime: string;
  endDateTime?: string;
  isAllDay: boolean;
  description?: string;
  colorId?: string;
}

/**
 * Paleta oficial de cores do Google Agenda (Event Colors 1 a 11).
 * Espelha fielmente a paleta de Color.kt do app nativo Kotlin.
 */
interface GoogleColorDef {
  id: string;
  r: number;
  g: number;
  b: number;
}

const GOOGLE_COLORS: GoogleColorDef[] = [
  { id: '1', r: 0x79, g: 0x86, b: 0xcb }, // Lavender
  { id: '2', r: 0x33, g: 0xb6, b: 0x79 }, // Sage
  { id: '3', r: 0x8e, g: 0x24, b: 0xaa }, // Grape
  { id: '4', r: 0xe6, g: 0x7c, b: 0x73 }, // Flamingo
  { id: '5', r: 0xf6, g: 0xbf, b: 0x26 }, // Banana
  { id: '6', r: 0xf4, g: 0x51, b: 0x1e }, // Tangerine
  { id: '7', r: 0x03, g: 0x9b, b: 0xe5 }, // Peacock
  { id: '8', r: 0x61, g: 0x61, b: 0x61 }, // Graphite
  { id: '9', r: 0x3f, g: 0x51, b: 0xb5 }, // Blueberry
  { id: '10', r: 0x0b, g: 0x80, b: 0x43 }, // Basil
  { id: '11', r: 0xd5, g: 0x00, b: 0x00 }, // Tomato
];

/**
 * Mapeia qualquer cor hexadecimal (ex: #10B981) para o colorId mais próximo do Google Calendar.
 */
export function getGoogleCalendarColorId(colorHex?: string): string {
  if (!colorHex) return '2';
  const clean = colorHex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;

  let bestId = '2';
  let minDistance = Infinity;

  for (const gc of GOOGLE_COLORS) {
    const dr = r - gc.r;
    const dg = g - gc.g;
    const db = b - gc.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDistance) {
      minDistance = dist;
      bestId = gc.id;
    }
  }

  return bestId;
}

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
    MomentusLog.calendar.warn('Módulo nativo expo-calendar indisponível neste ambiente:', err);
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
    MomentusLog.calendar.warn('Erro ao solicitar permissões de calendário:', error);
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

    // 2. Se for Android, busca prioritariamente a conta Google do usuário (com.google) para que sincronize automaticamente com a nuvem do Google Calendar
    if (Platform.OS === 'android') {
      const googleWritable = calendars.find(
        (c) =>
          c.allowsModifications &&
          (c.source?.type === 'com.google' ||
            c.source?.name?.toLowerCase().includes('@gmail.com') ||
            c.source?.name?.toLowerCase().includes('@google.com'))
      );
      if (googleWritable) {
        return googleWritable.id;
      }

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
    MomentusLog.calendar.warn('Erro ao obter calendário:', error);
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
 * Sincroniza um hábito para o Google Agenda (Web via REST API v3 / Android & iOS via expo-calendar).
 * Retorna o ID do evento criado ou atualizado.
 */
export async function syncHabitToDeviceCalendar(
  habit: HabitItem,
  category?: Category
): Promise<string | null> {
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

  const systemTimeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  // Sincronização Web via Google Calendar REST API v3
  if (Platform.OS === 'web') {
    const token = await getGoogleCalendarAccessToken();
    if (!token) return null;

    try {
      const googleColorId = getGoogleCalendarColorId(category?.color);
      const payload: Record<string, any> = {
        summary: habit.title,
        description: notes,
        colorId: googleColorId,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: systemTimeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: systemTimeZone,
        },
      };

      const eventId = habit.googleCalendarEventId;
      const url = eventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`
        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      const method = eventId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Se falhou ao atualizar (p. ex. evento não existe mais), tenta criar novo
        if (eventId && response.status === 404) {
          const createRes = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
          if (createRes.ok) {
            const created = await createRes.json();
            return created.id || null;
          }
        }
        return null;
      }

      const resData = await response.json();
      return resData.id || null;
    } catch (err) {
      MomentusLog.calendar.warn('Erro ao salvar evento no Google Agenda (Web):', err);
      return null;
    }
  }

  // Sincronização Mobile nativa via expo-calendar
  const Calendar = getCalendarModule();
  if (!Calendar) return null;

  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return null;

    const calendarId = await getOrCreateMomentusCalendarId();
    if (!calendarId) return null;

    // Se já possui googleCalendarEventId, tenta atualizar o evento existente
    if (habit.googleCalendarEventId) {
      try {
        const updatedId = await Calendar.updateEventAsync(habit.googleCalendarEventId, {
          title: habit.title,
          startDate,
          endDate,
          notes,
          timeZone: systemTimeZone,
          alarms: [{ relativeOffset: -10 }],
        });
        if (updatedId) return updatedId;
      } catch {
        // Evento pode ter sido apagado no app de calendário externo, criará um novo a seguir
      }
    }

    // Cria novo evento com alarme padrão de 10 min
    const newEventId = await Calendar.createEventAsync(calendarId, {
      title: habit.title,
      startDate,
      endDate,
      notes,
      allDay: false,
      timeZone: systemTimeZone,
      alarms: [{ relativeOffset: -10 }],
    });

    return newEventId;
  } catch (error) {
    MomentusLog.calendar.warn(`Erro ao sincronizar hábito "${habit.title}" com o calendário nativo:`, error);
    return null;
  }
}

/**
 * Remove um evento do Google Agenda ou calendário nativo do dispositivo.
 */
export async function deleteHabitFromDeviceCalendar(calendarEventId: string): Promise<void> {
  if (!calendarEventId) return;

  if (Platform.OS === 'web') {
    const token = await getGoogleCalendarAccessToken();
    if (!token) return;
    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch {}
    return;
  }

  const Calendar = getCalendarModule();
  if (!Calendar?.deleteEventAsync) return;

  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return;

    await Calendar.deleteEventAsync(calendarEventId);
  } catch {}
}

/**
 * Busca eventos do Google Agenda do usuário.
 * Espelha fielmente GoogleCalendarSourceImpl.kt (fetchEvents) do app nativo.
 */
export async function fetchGoogleCalendarEvents(
  targetDate?: string
): Promise<GoogleCalendarEventItem[]> {
  if (Platform.OS === 'web') {
    const token = await getGoogleCalendarAccessToken();
    if (!token) return [];
    try {
      const minDate = targetDate
        ? new Date(`${targetDate}T00:00:00Z`).toISOString()
        : new Date().toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(minDate)}&maxResults=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((ev: any) => ({
        id: ev.id,
        title: ev.summary || 'Evento',
        startDateTime: ev.start?.dateTime || ev.start?.date,
        endDateTime: ev.end?.dateTime || ev.end?.date,
        isAllDay: !!ev.start?.date,
        description: ev.description,
        colorId: ev.colorId,
      }));
    } catch {
      return [];
    }
  }

  const Calendar = getCalendarModule();
  if (!Calendar?.getEventsAsync) return [];

  try {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) return [];

    const calendarId = await getOrCreateMomentusCalendarId();
    if (!calendarId) return [];

    const start = targetDate ? new Date(`${targetDate}T00:00:00`) : new Date();
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = await Calendar.getEventsAsync([calendarId], start, end);
    return events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      startDateTime: typeof ev.startDate === 'string' ? ev.startDate : new Date(ev.startDate).toISOString(),
      endDateTime: typeof ev.endDate === 'string' ? ev.endDate : new Date(ev.endDate).toISOString(),
      isAllDay: !!ev.allDay,
      description: ev.notes,
    }));
  } catch {
    return [];
  }
}

/**
 * Converte eventos buscados do Google Agenda em instâncias de HabitItem integradas ao Momentus.
 * Preserva o status de conclusão e IDs locais caso o hábito já exista.
 */
export function convertGoogleEventsToHabits(
  googleEvents: GoogleCalendarEventItem[],
  categories: Category[],
  existingHabits: HabitItem[]
): HabitItem[] {
  const existingMap = new Map<string, HabitItem>();
  const signatureMap = new Map<string, HabitItem>();

  existingHabits.forEach((h) => {
    if (h.googleCalendarEventId) {
      existingMap.set(h.googleCalendarEventId, h);
    }
    existingMap.set(h.id, h);
    // Assinatura única baseada em data + horário de início + título normalizado
    const normTitle = (h.title || '').trim().toLowerCase();
    const sig = `${h.date}_${h.timeStart}_${normTitle}`;
    if (!signatureMap.has(sig)) {
      signatureMap.set(sig, h);
    }
  });

  const categoryMapByColor = new Map<string, string>();
  categories.forEach((c) => {
    const cid = getGoogleCalendarColorId(c.color);
    if (!categoryMapByColor.has(cid)) {
      categoryMapByColor.set(cid, c.id);
    }
  });

  const defaultCategoryId = categories[0]?.id || 'cat-outros';

  return googleEvents.map((gEvent) => {
    let dateStr = '';
    let timeStart = '08:00';
    let timeEnd = '09:00';

    if (gEvent.isAllDay) {
      dateStr = (gEvent.startDateTime || '').split('T')[0];
      timeStart = '08:00';
      timeEnd = '09:00';
    } else {
      const dStart = new Date(gEvent.startDateTime);
      const dEnd = gEvent.endDateTime ? new Date(gEvent.endDateTime) : new Date(dStart.getTime() + 60 * 60 * 1000);

      const y = dStart.getFullYear();
      const m = String(dStart.getMonth() + 1).padStart(2, '0');
      const d = String(dStart.getDate()).padStart(2, '0');
      dateStr = `${y}-${m}-${d}`;

      timeStart = `${String(dStart.getHours()).padStart(2, '0')}:${String(dStart.getMinutes()).padStart(2, '0')}`;
      timeEnd = `${String(dEnd.getHours()).padStart(2, '0')}:${String(dEnd.getMinutes()).padStart(2, '0')}`;
    }

    const normGTitle = (gEvent.title || '').trim().toLowerCase();
    const gSig = `${dateStr}_${timeStart}_${normGTitle}`;

    // Procura por ID do Google, por ID local prefixado ou por assinatura idêntica (data + hora + título)
    const existing =
      existingMap.get(gEvent.id) ||
      existingMap.get(`google_${gEvent.id}`) ||
      signatureMap.get(gSig);

    const matchedCatId =
      existing?.categoryId ||
      (gEvent.colorId ? categoryMapByColor.get(gEvent.colorId) : null) ||
      defaultCategoryId;

    return {
      id: existing ? existing.id : `google_${gEvent.id}`,
      title: gEvent.title,
      description: gEvent.description || existing?.description || undefined,
      timeStart,
      timeEnd,
      categoryId: matchedCatId,
      completed: existing ? existing.completed : false,
      date: dateStr,
      streak: existing ? existing.streak : 0,
      googleCalendarEventId: gEvent.id,
      saveToGoogle: true,
      isFromGoogleCalendar: true,
      templateSourceId: existing?.templateSourceId ?? null,
    };
  });
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

  if (Platform.OS !== 'web') {
    const hasPermission = await requestDeviceCalendarPermissions();
    if (!hasPermission) {
      return { syncedCount: 0, updatedHabits: habits };
    }
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
