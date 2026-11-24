import type { Achievement, HabitItem } from '@/types';
import { calculateUserLevel } from '@/domain/userLevel';

export type XpEvolutionRange = '30D' | '90D';

export interface XpEvolutionPoint {
  dateStr: string;
  shortLabel: string;
  fullLabel: string;
  cumulativeXp: number;
  gainedXp: number;
  level: number;
}

export interface XpEvolutionSummary {
  points: XpEvolutionPoint[];
  totalGainedInRange: number;
  startXp: number;
  endXp: number;
  startLevel: number;
  endLevel: number;
  activeDaysCount: number;
}

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

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS_PT[date.getMonth()]}`;
}

function parseUnlockedAtToDateKey(unlockedAt?: string | null): string | null {
  if (!unlockedAt) return null;
  const trimmed = unlockedAt.trim();

  // Formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm...
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Formato PT-BR: DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKey(parsed);
  }
  return null;
}

/**
 * Formata valores de XP de forma compacta para o eixo Y do gráfico.
 */
export function formatCompactXp(xp: number): string {
  if (xp >= 10000) {
    return `${(xp / 1000).toFixed(0)}k`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '')}k`;
  }
  return String(Math.max(0, Math.round(xp)));
}

/**
 * Reconstrói a curva histórica acumulada de XP ao longo dos últimos 30 dias (mês)
 * ou 90 dias (trimestre), ancorada no `totalPoints` real atual do usuário.
 */
export function buildXpEvolutionSeries(
  habits: HabitItem[],
  focusHistoryMap: Record<string, number>,
  achievements: Achievement[],
  currentTotalPoints: number,
  range: XpEvolutionRange
): XpEvolutionSummary {
  const safeCurrentTotal = Math.max(0, Math.round(currentTotalPoints || 0));
  const totalDays = range === '30D' ? 30 : 90;
  const bucketSize = range === '30D' ? 3 : 6; // 10 pontos para 30D, 15 pontos para 90D

  // 1. Mapeia ganho diário real de XP (hábitos concluídos + bônus de dia perfeito + foco + conquistas)
  const habitsByDate: Record<string, HabitItem[]> = {};
  habits.forEach((h) => {
    if (!h.date) return;
    if (!habitsByDate[h.date]) habitsByDate[h.date] = [];
    habitsByDate[h.date].push(h);
  });

  const dailyXpGained: Record<string, number> = {};

  Object.entries(habitsByDate).forEach(([dateStr, dayHabits]) => {
    const completedCount = dayHabits.filter((h) => h.completed).length;
    if (completedCount === 0) return;

    let dayXp = completedCount * 10;
    if (dayHabits.length > 0 && completedCount === dayHabits.length) {
      dayXp += 25; // Bônus de dia 100% concluído
    }
    dailyXpGained[dateStr] = (dailyXpGained[dateStr] || 0) + dayXp;
  });

  Object.entries(focusHistoryMap).forEach(([dateStr, mins]) => {
    if (mins > 0) {
      const focusXp = 10 + Math.floor(mins / 2);
      dailyXpGained[dateStr] = (dailyXpGained[dateStr] || 0) + focusXp;
    }
  });

  achievements.forEach((ach) => {
    if (!ach.unlocked || !ach.xpReward) return;
    const dateKey = parseUnlockedAtToDateKey(ach.unlockedAt);
    if (dateKey) {
      dailyXpGained[dateKey] = (dailyXpGained[dateKey] || 0) + ach.xpReward;
    }
  });

  // 2. Gera série diária completa (do dia mais antigo até hoje)
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const dayEntries: Array<{
    date: Date;
    dateStr: string;
    gainedXp: number;
    cumulativeXp: number;
  }> = [];

  for (let offset = totalDays - 1; offset >= 0; offset--) {
    const d = new Date(now);
    d.setDate(now.getDate() - offset);
    const dateStr = formatDateKey(d);
    dayEntries.push({
      date: d,
      dateStr,
      gainedXp: dailyXpGained[dateStr] || 0,
      cumulativeXp: 0,
    });
  }

  // 3. Ancora o último ponto (hoje) exatamente no totalPoints atual e reconstrói de trás para frente
  let runningXp = safeCurrentTotal;
  for (let i = dayEntries.length - 1; i >= 0; i--) {
    dayEntries[i].cumulativeXp = Math.max(0, runningXp);
    runningXp = Math.max(0, runningXp - dayEntries[i].gainedXp);
  }

  const activeDaysCount = dayEntries.filter((d) => d.gainedXp > 0).length;

  // 4. Agrupa em checkpoints limpos preservando sempre o ponto inicial e o ponto final exato (hoje)
  const points: XpEvolutionPoint[] = [];
  for (let startIdx = 0; startIdx < dayEntries.length; startIdx += bucketSize) {
    const endIdx = Math.min(dayEntries.length - 1, startIdx + bucketSize - 1);
    const slice = dayEntries.slice(startIdx, endIdx + 1);
    const lastEntry = slice[slice.length - 1];
    const firstEntry = slice[0];
    const bucketGained = slice.reduce((acc, item) => acc + item.gainedXp, 0);

    const shortLabel = formatShortDate(lastEntry.date);
    const fullLabel =
      slice.length > 1
        ? `${formatShortDate(firstEntry.date)} – ${formatShortDate(lastEntry.date)}`
        : shortLabel;

    points.push({
      dateStr: lastEntry.dateStr,
      shortLabel,
      fullLabel,
      cumulativeXp: lastEntry.cumulativeXp,
      gainedXp: bucketGained,
      level: calculateUserLevel(lastEntry.cumulativeXp).level,
    });
  }

  const startXp = points.length > 0 ? points[0].cumulativeXp : safeCurrentTotal;
  const endXp = points.length > 0 ? points[points.length - 1].cumulativeXp : safeCurrentTotal;
  const totalGainedInRange = Math.max(
    0,
    dayEntries.reduce((acc, item) => acc + item.gainedXp, 0)
  );

  return {
    points,
    totalGainedInRange,
    startXp,
    endXp,
    startLevel: calculateUserLevel(startXp).level,
    endLevel: calculateUserLevel(endXp).level,
    activeDaysCount,
  };
}
