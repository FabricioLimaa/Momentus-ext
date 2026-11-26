import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseVoiceHabitCommand } from '@/domain/voiceHabitParser';
import { computeProductivityInsight } from '@/domain/productivityInsights';
import { buildXpEvolutionSeries, formatCompactXp } from '@/domain/xpEvolution';
import { calculateUserLevel } from '@/domain/userLevel';
import {
  calculateStreakFromCompletedDays,
  formatDateToBr,
  getFullyCompletedDates,
  parseBrDateToIso,
} from '@/constants/initialData';
import type { Achievement, Category, HabitItem } from '@/types';

const SAMPLE_CATEGORIES: Category[] = [
  { id: 'cat-outros', name: 'Outros', color: '#616161', stickerId: null, metaMinutosSemanal: null },
  { id: 'cat-saude', name: 'Saúde', color: '#10B981', stickerId: null, metaMinutosSemanal: 180 },
  { id: 'cat-trabalho', name: 'Trabalho', color: '#38BDF8', stickerId: null, metaMinutosSemanal: 300 },
  { id: 'cat-estudos', name: 'Estudos', color: '#A855F7', stickerId: null, metaMinutosSemanal: 240 },
  { id: 'cat-pessoal', name: 'Pessoal', color: '#F59E0B', stickerId: null, metaMinutosSemanal: null },
];

function localDateOffset(daysOffset: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('voiceHabitParser.ts (25+ cenários PT-BR + NFD/NFC + regressões P1-1)', () => {
  // Referência: Quinta-feira, 26 de Novembro de 2026
  const refThu = new Date(2026, 10, 26, 10, 0, 0);

  it('reconhece frase completa clássica com data relativa, hora e categoria explícita', () => {
    const res = parseVoiceHabitCommand('Academia amanhã às 18h categoria Saúde', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.title, 'Academia');
    assert.equal(res.date, '2026-11-27');
    assert.equal(res.timeStart, '18:00');
    assert.equal(res.timeEnd, '19:00');
    assert.equal(res.categoryId, 'cat-saude');
  });

  it('reconhece frase com "em Saúde" sem deixar sobra no título', () => {
    const res = parseVoiceHabitCommand('Academia amanhã às 18h em Saúde', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.title, 'Academia');
    assert.equal(res.date, '2026-11-27');
    assert.equal(res.timeStart, '18:00');
    assert.equal(res.categoryId, 'cat-saude');
  });

  it('[Regressão Bug A] "Dentista dia 30/11 às 15:00" não confunde mês/dia com hora inicial', () => {
    const res = parseVoiceHabitCommand('Dentista dia 30/11 às 15:00', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.title, 'Dentista');
    assert.equal(res.date, '2026-11-30');
    assert.equal(res.timeStart, '15:00');
    assert.equal(res.timeEnd, '16:00');
    assert.equal(res.categoryId, 'cat-saude');
  });

  it('[Regressão Bug A] "Pagar contas dia 05 às 10h" preserva dia 05 e hora 10:00', () => {
    const res = parseVoiceHabitCommand('Pagar contas dia 05 às 10h', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.title, 'Pagar contas');
    assert.equal(res.date, '2026-12-05');
    assert.equal(res.timeStart, '10:00');
    assert.equal(res.timeEnd, '11:00');
  });

  it('[Regressão Bug B] "Estudar 2h às 19h" interpreta 2h como duração e 19:00–21:00', () => {
    const res = parseVoiceHabitCommand('Estudar 2h às 19h', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.title, 'Estudar');
    assert.equal(res.timeStart, '19:00');
    assert.equal(res.timeEnd, '21:00');
    assert.equal(res.categoryId, 'cat-estudos');
  });

  it('[Regressão Bug C] "Academia categoria sa amanhã às 18h" não apaga data e horário', () => {
    const res = parseVoiceHabitCommand('Academia categoria sa amanhã às 18h', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.date, '2026-11-27');
    assert.equal(res.timeStart, '18:00');
    assert.equal(res.categoryId, 'cat-saude');
    assert.equal(res.title, 'Academia');
  });

  it('[Regressão Bug D] rejeita data impossível "31/02" sem rollover silencioso', () => {
    const res = parseVoiceHabitCommand('Reunião dia 31/02 às 14h', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.date, undefined);
    assert.equal(res.matchedFields.date, false);
    assert.equal(res.timeStart, '14:00');
  });

  it('[Regressão Bug E] "Estudar 1h" não interpreta 1h como 01:00 da madrugada', () => {
    const res = parseVoiceHabitCommand('Estudar 1h', SAMPLE_CATEGORIES, refThu);
    assert.equal(res.timeStart, undefined);
    assert.equal(res.matchedFields.time, false);
    assert.equal(res.categoryId, 'cat-estudos');
  });

  it('[Regressão Bug F] em 31/Jan, "Pagar aluguel dia 30" avança para 30/Mar (sem rollover para 02/Mar)', () => {
    const jan31 = new Date(2026, 0, 31, 9, 0, 0);
    const res = parseVoiceHabitCommand('Pagar aluguel dia 30', SAMPLE_CATEGORIES, jan31);
    assert.equal(res.date, '2026-03-30');
  });

  it('reconhece "hoje" e "depois de amanhã"', () => {
    const rHoje = parseVoiceHabitCommand('Meditação hoje às 7h30', SAMPLE_CATEGORIES, refThu);
    assert.equal(rHoje.date, '2026-11-26');
    assert.equal(rHoje.timeStart, '07:30');

    const rDepois = parseVoiceHabitCommand('Revisão depois de amanhã às 14h', SAMPLE_CATEGORIES, refThu);
    assert.equal(rDepois.date, '2026-11-28');
    assert.equal(rDepois.timeStart, '14:00');
  });

  it('reconhece dias da semana (sexta, próxima segunda, sábado, domingo)', () => {
    const rSex = parseVoiceHabitCommand('Corrida na sexta-feira às 6h', SAMPLE_CATEGORIES, refThu);
    assert.equal(rSex.date, '2026-11-27');
    assert.equal(rSex.timeStart, '06:00');

    const rSeg = parseVoiceHabitCommand('Daily próxima segunda às 9h', SAMPLE_CATEGORIES, refThu);
    assert.equal(rSeg.date, '2026-11-30');
    assert.equal(rSeg.timeStart, '09:00');
    assert.equal(rSeg.categoryId, 'cat-trabalho');

    const rSab = parseVoiceHabitCommand('Mercado sábado às 10h', SAMPLE_CATEGORIES, refThu);
    assert.equal(rSab.date, '2026-11-28');
    assert.equal(rSab.categoryId, 'cat-pessoal');
  });

  it('reconhece faixas horárias e duração explícita ("por 45 minutos", "das 14h30 às 16h")', () => {
    const rRange = parseVoiceHabitCommand('Sprint das 14h30 às 16h', SAMPLE_CATEGORIES, refThu);
    assert.equal(rRange.timeStart, '14:30');
    assert.equal(rRange.timeEnd, '16:00');

    const rDur = parseVoiceHabitCommand('Leitura hoje às 21h por 45 minutos', SAMPLE_CATEGORIES, refThu);
    assert.equal(rDur.timeStart, '21:00');
    assert.equal(rDur.timeEnd, '21:45');
    assert.equal(rDur.categoryId, 'cat-estudos');
  });

  it('reconhece qualificadores "da tarde", "da noite", "meio-dia" e "meia-noite"', () => {
    const rTarde = parseVoiceHabitCommand('Reunião cliente às 3 da tarde', SAMPLE_CATEGORIES, refThu);
    assert.equal(rTarde.timeStart, '15:00');

    const rNoite = parseVoiceHabitCommand('Yoga às 8 e meia da noite', SAMPLE_CATEGORIES, refThu);
    assert.equal(rNoite.timeStart, '20:30');

    const rNoon = parseVoiceHabitCommand('Almoço ao meio-dia e meia', SAMPLE_CATEGORIES, refThu);
    assert.equal(rNoon.timeStart, '12:30');

    const rMid = parseVoiceHabitCommand('Backup à meia-noite', SAMPLE_CATEGORIES, refThu);
    assert.equal(rMid.timeStart, '00:00');
  });

  it('preserva acentos e índices com entrada decomposta NFD (iOS Dictation)', () => {
    const nfdInput = 'Meditação amanhã às 07:30 categoria Saúde'.normalize('NFD');
    const res = parseVoiceHabitCommand(nfdInput, SAMPLE_CATEGORIES, refThu);
    assert.equal(res.title, 'Meditação');
    assert.equal(res.date, '2026-11-27');
    assert.equal(res.timeStart, '07:30');
    assert.equal(res.categoryId, 'cat-saude');
  });

  it('lida com entrada vazia e remove verbos iniciais ("Criar", "Agendar")', () => {
    const empty = parseVoiceHabitCommand('   ', SAMPLE_CATEGORIES, refThu);
    assert.equal(empty.title, '');
    assert.equal(empty.matchedFields.date, false);

    const verb = parseVoiceHabitCommand('Agendar treino funcional hoje às 18h', SAMPLE_CATEGORIES, refThu);
    assert.equal(verb.title, 'Treino funcional');
    assert.equal(verb.timeStart, '18:00');
  });
});

describe('productivityInsights.ts (vazio, 1d, 30d, 90d e exclusão de futuro)', () => {
  it('retorna hasEnoughData=false para histórico vazio ou apenas 1 hábito sem foco', () => {
    const emptyRes = computeProductivityInsight([], {}, 7);
    assert.equal(emptyRes.hasEnoughData, false);

    const oneHabit: HabitItem[] = [
      { id: '1', title: 'Água', timeStart: '08:00', categoryId: 'cat-saude', completed: true, date: localDateOffset(0), streak: 1 },
    ];
    const oneRes = computeProductivityInsight(oneHabit, {}, 7);
    assert.equal(oneRes.hasEnoughData, false);
  });

  it('[Regressão P1-2] não inclui hábitos futuros (ex.: 2099-01-01) no fallback de histórico completo', () => {
    const futureHabits: HabitItem[] = [
      { id: 'f1', title: 'Futuro 1', timeStart: '09:00', categoryId: 'cat-trabalho', completed: true, date: '2099-01-01', streak: 1 },
      { id: 'f2', title: 'Futuro 2', timeStart: '10:00', categoryId: 'cat-trabalho', completed: true, date: '2099-01-01', streak: 1 },
    ];
    const res = computeProductivityInsight(futureHabits, { '2099-01-01': 120 }, 7);
    assert.equal(res.hasEnoughData, false);
  });

  it('identifica pico corretamente em 1d, 30d e 90d com fallback', () => {
    const today = localDateOffset(0);
    const oldDay = localDateOffset(-45);
    const habits: HabitItem[] = [
      { id: 'h1', title: 'Foco 1', timeStart: '09:00', timeEnd: '10:00', categoryId: 'cat-trabalho', completed: true, date: today, streak: 1 },
      { id: 'h2', title: 'Foco 2', timeStart: '10:00', timeEnd: '11:00', categoryId: 'cat-trabalho', completed: true, date: today, streak: 1 },
    ];
    const res7 = computeProductivityInsight(habits, { [today]: 50 }, 7);
    assert.equal(res7.hasEnoughData, true);
    assert.equal(res7.usedFullHistoryFallback, false);
    assert.equal(res7.peakShiftLabel, 'Manhã');

    const oldHabits: HabitItem[] = [
      { id: 'o1', title: 'Antigo 1', timeStart: '14:00', timeEnd: '15:00', categoryId: 'cat-trabalho', completed: true, date: oldDay, streak: 1 },
      { id: 'o2', title: 'Antigo 2', timeStart: '15:00', timeEnd: '16:00', categoryId: 'cat-trabalho', completed: true, date: oldDay, streak: 1 },
    ];
    const resFallback = computeProductivityInsight(oldHabits, {}, 7);
    assert.equal(resFallback.hasEnoughData, true);
    assert.equal(resFallback.usedFullHistoryFallback, true);

    const res90 = computeProductivityInsight(oldHabits, {}, 90);
    assert.equal(res90.hasEnoughData, true);
    assert.equal(res90.usedFullHistoryFallback, false);
  });
});

describe('xpEvolution.ts (15 XP/hábito, rotina +20, DD-MM-YYYY e múltiplas sessões foco)', () => {
  it('calcula corretamente 15 XP/hábito, +25 dia completo, +20 rotina e conquista DD-MM-YYYY', () => {
    const today = localDateOffset(0);
    const todayBrDash = formatDateToBr(today); // DD-MM-YYYY
    const habits: HabitItem[] = [
      { id: '1', title: 'A', timeStart: '08:00', categoryId: 'cat-saude', completed: true, date: today, streak: 1, templateSourceId: 'tmpl-1' },
      { id: '2', title: 'B', timeStart: '09:00', categoryId: 'cat-saude', completed: true, date: today, streak: 1, templateSourceId: 'tmpl-1' },
    ];
    const achievements: Achievement[] = [
      { id: 'FIRST_HABIT', title: 'Primeiro', description: '', icon: 'trophy', unlocked: true, unlockedAt: todayBrDash, progress: 1, maxProgress: 1, xpReward: 10 },
    ];
    // 2*15 (30) + 25 (dia) + 20 (rotina) + 10 (conquista) + foco 50m (2 sessões*10 + 25 = 45) = 130 XP
    const series = buildXpEvolutionSeries(habits, { [today]: 50 }, achievements, 500, '30D');
    assert.equal(series.endXp, 500);
    assert.equal(series.totalGainedInRange, 130);
    assert.equal(series.points.length, 10);

    const series90 = buildXpEvolutionSeries([], {}, [], 0, '90D');
    assert.equal(series90.points.length, 15);
    assert.equal(series90.totalGainedInRange, 0);
    assert.equal(formatCompactXp(2450), '2,5k');
  });
});

describe('userLevel.ts & calculateStreakFromCompletedDays', () => {
  it('faz clamp em XP negativo e calcula níveis corretamente', () => {
    const neg = calculateUserLevel(-50);
    assert.equal(neg.level, 1);
    assert.equal(neg.currentXp, 0);
    assert.equal(neg.progress, 0);

    assert.equal(calculateUserLevel(0).level, 1);
    assert.equal(calculateUserLevel(100).level, 2);
    assert.equal(calculateUserLevel(1000).level, 5);
    assert.equal(calculateUserLevel(2450).level, 7);
  });

  it('[Regressão P1-2] streak ignora datas futuras ao calcular sequência atual', () => {
    const d0 = '2026-11-26';
    const days = ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'];
    assert.equal(calculateStreakFromCompletedDays(days, d0), 3);

    assert.equal(parseBrDateToIso('26-11-2026'), '2026-11-26');
    assert.equal(parseBrDateToIso('26/11/2026'), '2026-11-26');
    assert.deepEqual(
      getFullyCompletedDates([
        { id: '1', title: 'A', timeStart: '08:00', categoryId: 'c', completed: true, date: '2026-11-26', streak: 1 },
        { id: '2', title: 'B', timeStart: '09:00', categoryId: 'c', completed: false, date: '2026-11-25', streak: 0 },
      ]),
      ['2026-11-26']
    );
  });
});

describe('Validação de estrutura de Backup (integridade e resiliência)', () => {
  it('rejeita payloads inválidos e preserva focusHistoryMap válido', () => {
    const isValidBackup = (raw: any) => {
      if (!raw || typeof raw !== 'object' || !raw.data) return false;
      if (!Array.isArray(raw.data.habits) || !Array.isArray(raw.data.categories)) return false;
      return raw.data.habits.every((h: any) => h && typeof h.id === 'string' && typeof h.title === 'string' && typeof h.date === 'string');
    };
    assert.equal(isValidBackup(null), false);
    assert.equal(isValidBackup({ data: { habits: 'bad', categories: [] } }), false);
    assert.equal(isValidBackup({ data: { habits: [{ broken: true }], categories: [] } }), false);
    assert.equal(
      isValidBackup({
        version: 1,
        data: {
          habits: [{ id: 'h-1', title: 'Água', date: '2026-11-26' }],
          categories: [{ id: 'cat-outros', name: 'Outros' }],
          focusHistoryMap: { '2026-11-26': 50 },
        },
      }),
      true
    );
  });
});
