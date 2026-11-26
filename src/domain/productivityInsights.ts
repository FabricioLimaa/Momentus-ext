import type { HabitItem } from '@/types';

export type ProductivityShift = 'madrugada' | 'manhã' | 'tarde' | 'noite';

export interface ProductivityInsightResult {
  hasEnoughData: boolean;
  usedFullHistoryFallback: boolean;
  headline: string;
  subtext: string;
  peakWeekdayShort: string | null;
  peakWindowLabel: string | null;
  peakShiftLabel: string | null;
  peakShiftPercentage: number | null;
  peakFocusMinutesOnDay: number;
}

const WEEKDAY_PLURAL_PT = [
  'nos domingos',
  'nas segundas-feiras',
  'nas terças-feiras',
  'nas quartas-feiras',
  'nas quintas-feiras',
  'nas sextas-feiras',
  'nos sábados',
];

const WEEKDAY_SHORT_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const SHIFT_DISPLAY_PT: Record<ProductivityShift, string> = {
  madrugada: 'Madrugada',
  manhã: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

function parseDateLocal(dateStr: string): Date | null {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function formatSlotTime(slotIndex: number): string {
  const clamped = Math.max(0, Math.min(48, slotIndex));
  const totalMins = clamped * 30;
  const hh = Math.floor(totalMins / 60) % 24;
  const mm = totalMins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function getShiftForMinutes(mins: number): ProductivityShift {
  const hour = Math.floor(mins / 60) % 24;
  if (hour < 6) return 'madrugada';
  if (hour < 12) return 'manhã';
  if (hour < 18) return 'tarde';
  return 'noite';
}

function analyzeDataset(
  periodHabits: HabitItem[],
  focusEntries: Array<[string, number]>
): Omit<ProductivityInsightResult, 'usedFullHistoryFallback'> | null {
  const completedHabits = periodHabits.filter((h) => h.completed);
  const totalFocusMinutes = focusEntries.reduce((acc, [, mins]) => acc + (mins > 0 ? mins : 0), 0);

  if (completedHabits.length < 2 && totalFocusMinutes < 15) {
    return null;
  }

  // 1. Pontuação ponderada por dia da semana (conclusões + taxa de acerto + minutos de foco)
  const weekdayStats = Array.from({ length: 7 }, () => ({
    completed: 0,
    total: 0,
    focusMins: 0,
    focusDays: 0,
  }));

  periodHabits.forEach((h) => {
    const d = parseDateLocal(h.date);
    if (!d) return;
    const dow = d.getDay();
    weekdayStats[dow].total += 1;
    if (h.completed) {
      weekdayStats[dow].completed += 1;
    }
  });

  focusEntries.forEach(([dateStr, mins]) => {
    if (mins <= 0) return;
    const d = parseDateLocal(dateStr);
    if (!d) return;
    const dow = d.getDay();
    weekdayStats[dow].focusMins += mins;
    weekdayStats[dow].focusDays += 1;
  });

  let bestDow = -1;
  let bestDowScore = -1;
  weekdayStats.forEach((st, dow) => {
    if (st.completed === 0 && st.focusMins === 0) return;
    const rate = st.total > 0 ? st.completed / st.total : 0;
    const score = st.completed * 25 + rate * 20 + st.focusMins * 1.2;
    if (score > bestDowScore) {
      bestDowScore = score;
      bestDow = dow;
    }
  });

  // 2. Densidade em slots de 30 minutos (0..47) para descobrir a janela contígua de pico
  const halfHourWeights = new Array<number>(48).fill(0);
  const shiftCounts: Record<ProductivityShift, number> = {
    madrugada: 0,
    manhã: 0,
    tarde: 0,
    noite: 0,
  };

  let timedCompletedCount = 0;

  completedHabits.forEach((h) => {
    const startMin = parseTimeToMinutes(h.timeStart);
    if (startMin === null) return;
    timedCompletedCount += 1;

    const rawEndMin = parseTimeToMinutes(h.timeEnd);
    const endMin =
      rawEndMin !== null && rawEndMin > startMin
        ? Math.min(rawEndMin, startMin + 180)
        : Math.min(24 * 60, startMin + 45);

    const startSlot = Math.floor(startMin / 30);
    const endSlot = Math.max(startSlot + 1, Math.min(48, Math.ceil(endMin / 30)));

    for (let s = startSlot; s < endSlot; s++) {
      // Peso ligeiramente maior no slot de início da rotina
      halfHourWeights[s] += s === startSlot ? 1.5 : 1;
    }

    const shift = getShiftForMinutes(startMin);
    shiftCounts[shift] += 1;
  });

  // Busca a janela contígua ótima de 2h30 (5 slots) reduzida ao intervalo efetivamente ativo
  let peakStartSlot: number | null = null;
  let peakEndSlot: number | null = null;

  if (timedCompletedCount > 0) {
    const windowSize = 5; // até 2h30 (ex.: 09:00 às 11:30)
    let bestWindowSum = 0;
    let bestWindowStart = 0;

    for (let start = 0; start <= 48 - windowSize; start++) {
      let sum = 0;
      for (let k = 0; k < windowSize; k++) {
        sum += halfHourWeights[start + k];
      }
      if (sum > bestWindowSum) {
        bestWindowSum = sum;
        bestWindowStart = start;
      }
    }

    if (bestWindowSum > 0) {
      let trimmedStart = bestWindowStart;
      let trimmedEnd = bestWindowStart + windowSize;

      while (trimmedStart < trimmedEnd - 1 && halfHourWeights[trimmedStart] === 0) {
        trimmedStart += 1;
      }
      while (trimmedEnd > trimmedStart + 1 && halfHourWeights[trimmedEnd - 1] === 0) {
        trimmedEnd -= 1;
      }

      // Garante janela legível de pelo menos 1h (2 slots)
      if (trimmedEnd - trimmedStart < 2 && trimmedEnd < 48) {
        trimmedEnd = Math.min(48, trimmedStart + 2);
      }

      peakStartSlot = trimmedStart;
      peakEndSlot = trimmedEnd;
    }
  }

  // 3. Turno predominante
  let bestShift: ProductivityShift | null = null;
  let bestShiftCount = 0;
  (Object.keys(shiftCounts) as ProductivityShift[]).forEach((shift) => {
    if (shiftCounts[shift] > bestShiftCount) {
      bestShiftCount = shiftCounts[shift];
      bestShift = shift;
    }
  });

  const peakShiftPct =
    bestShift && timedCompletedCount > 0
      ? Math.round((bestShiftCount / timedCompletedCount) * 100)
      : null;

  const weekdayPlural = bestDow >= 0 ? WEEKDAY_PLURAL_PT[bestDow] : null;
  const weekdayShort = bestDow >= 0 ? WEEKDAY_SHORT_PT[bestDow] : null;
  const peakFocusMins = bestDow >= 0 ? weekdayStats[bestDow].focusMins : 0;

  const windowStartStr = peakStartSlot !== null ? formatSlotTime(peakStartSlot) : null;
  const windowEndStr = peakEndSlot !== null ? formatSlotTime(peakEndSlot) : null;
  const peakWindowLabel =
    windowStartStr && windowEndStr ? `${windowStartStr}–${windowEndStr}` : null;

  // 4. Monta a frase Zen principal e o subtexto acionável
  let headline: string;
  if (weekdayPlural && windowStartStr && windowEndStr) {
    headline = `Seu pico de produtividade ocorre ${weekdayPlural} entre ${windowStartStr} e ${windowEndStr}.`;
  } else if (windowStartStr && windowEndStr) {
    headline = `Sua melhor janela de foco acontece entre ${windowStartStr} e ${windowEndStr}.`;
  } else if (weekdayPlural && peakFocusMins > 0) {
    headline = `Seu maior acúmulo de foco ocorre ${weekdayPlural} (${peakFocusMins} min registrados).`;
  } else if (weekdayPlural) {
    headline = `Seu dia mais consistente de execução acontece ${weekdayPlural}.`;
  } else {
    return null;
  }

  let subtext: string;
  if (bestShift && peakShiftPct !== null && peakShiftPct >= 40) {
    const shiftArticle =
      bestShift === 'manhã' || bestShift === 'tarde' || bestShift === 'noite' || bestShift === 'madrugada'
        ? `da ${bestShift}`
        : `de ${bestShift}`;
    subtext = `Você concentra ${peakShiftPct}% das suas rotinas concluídas no turno ${shiftArticle}. Aproveite esse ritmo para priorizar tarefas de foco profundo.`;
  } else if (peakFocusMins > 0 && weekdayPlural) {
    subtext = `Além da consistência nas rotinas, você acumulou ${peakFocusMins} min de foco profundo ${weekdayPlural}.`;
  } else {
    subtext = 'Continue registrando rotinas e sessões de foco para refinar ainda mais a leitura dos seus picos.';
  }

  return {
    hasEnoughData: true,
    headline,
    subtext,
    peakWeekdayShort: weekdayShort,
    peakWindowLabel,
    peakShiftLabel: bestShift ? SHIFT_DISPLAY_PT[bestShift] : null,
    peakShiftPercentage: peakShiftPct,
    peakFocusMinutesOnDay: peakFocusMins,
  };
}

/**
 * Calcula em memória os padrões de pico de produtividade e foco do usuário
 * a partir dos hábitos concluídos e do `focusHistoryMap`.
 */
export function computeProductivityInsight(
  habits: HabitItem[],
  focusHistoryMap: Record<string, number>,
  periodDays: number
): ProductivityInsightResult {
  const now = new Date();
  const sinceDate = new Date(now);
  sinceDate.setDate(now.getDate() - periodDays + 1);
  sinceDate.setHours(0, 0, 0, 0);

  const periodHabits = habits.filter((h) => {
    const d = parseDateLocal(h.date);
    return d !== null && d >= sinceDate && d <= now;
  });

  const periodFocusEntries = Object.entries(focusHistoryMap).filter(([dateStr, mins]) => {
    if (mins <= 0) return false;
    const d = parseDateLocal(dateStr);
    return d !== null && d >= sinceDate && d <= now;
  });

  const periodResult = analyzeDataset(periodHabits, periodFocusEntries);
  if (periodResult) {
    return { ...periodResult, usedFullHistoryFallback: false };
  }

  // Fallback suave para o histórico completo (excluindo datas futuras) caso o filtro curto ainda tenha poucos dados
  const pastOrTodayHabits = habits.filter((h) => {
    const d = parseDateLocal(h.date);
    return d !== null && d <= now;
  });
  const allFocusEntries = Object.entries(focusHistoryMap).filter(([dateStr, mins]) => {
    if (mins <= 0) return false;
    const d = parseDateLocal(dateStr);
    return d !== null && d <= now;
  });
  const fullHistoryResult = analyzeDataset(pastOrTodayHabits, allFocusEntries);
  if (fullHistoryResult) {
    return { ...fullHistoryResult, usedFullHistoryFallback: true };
  }

  return {
    hasEnoughData: false,
    usedFullHistoryFallback: false,
    headline: 'Ainda estamos mapeando seu ritmo natural de produtividade.',
    subtext:
      'Conclua ao menos 2 rotinas ou uma sessão de Foco Pomodoro para descobrirmos seu dia e janela horária de pico.',
    peakWeekdayShort: null,
    peakWindowLabel: null,
    peakShiftLabel: null,
    peakShiftPercentage: null,
    peakFocusMinutesOnDay: 0,
  };
}
