import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  getContrastTextColor,
  LayoutTokens,
  BorderRadiusTokens,
  TypographyTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { WeeklySummaryModal } from '@/components/momentus/WeeklySummaryModal';
import { CircularProgressRing } from '@/components/momentus/CircularProgressRing';

type StatsFilter = 'WEEK' | 'MONTH' | 'YEAR';

export default function StatsScreen() {
  const { habits, categories, theme, userProfile, userLevel, focusHistoryMap, triggerHaptic } = useMomentus();
  const [filter, setFilter] = useState<StatsFilter>('WEEK');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [isStoriesModalOpen, setIsStoriesModalOpen] = useState(false);

  const filterDays = useMemo(() => {
    switch (filter) {
      case 'WEEK':
        return 7;
      case 'MONTH':
        return 30;
      case 'YEAR':
        return 365;
    }
  }, [filter]);

  // Cálculo autêntico equivalente a GetStatsUseCase.kt
  const stats = useMemo(() => {
    const now = new Date();

    // Data de corte para o período atual
    const sinceDate = new Date(now);
    sinceDate.setDate(now.getDate() - filterDays + 1);
    sinceDate.setHours(0, 0, 0, 0);

    // Data de corte para o período anterior
    const prevSinceDate = new Date(sinceDate);
    prevSinceDate.setDate(sinceDate.getDate() - filterDays);

    const parseHabitDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    // Hábitos estritamente pertencentes ao período selecionado
    const currentPeriodHabits = habits.filter((h) => {
      const d = parseHabitDate(h.date);
      return d >= sinceDate && d <= now;
    });

    const currentCompleted = currentPeriodHabits.filter((h) => h.completed);

    const previousCompleted = habits.filter((h) => {
      if (!h.completed) return false;
      const d = parseHabitDate(h.date);
      return d >= prevSinceDate && d < sinceDate;
    });

    const currentCount = currentCompleted.length;
    const totalPeriodHabits = currentPeriodHabits.length;
    const previousCount = previousCompleted.length;

    // Taxa Geral de Aproveitamento (Anel Hero)
    const overallCompletionRate =
      totalPeriodHabits > 0
        ? Math.round((currentCount / totalPeriodHabits) * 100)
        : 0;

    let feedbackTitle = 'Construindo Ritmo 🌱';
    let feedbackSubtitle = 'Mantenha o foco diário para acelerar o progresso.';
    let feedbackColor = MomentusColors.gold;

    if (overallCompletionRate >= 80) {
      feedbackTitle = 'Desempenho Extraordinário 🚀';
      feedbackSubtitle = 'Consistência impecável em praticamente todas as rotinas!';
      feedbackColor = theme.primary;
    } else if (overallCompletionRate >= 50) {
      feedbackTitle = 'Consistência Sólida ⚡';
      feedbackSubtitle = 'Mais da metade das suas rotinas estão sendo cumpridas com sucesso.';
      feedbackColor = MomentusColors.cyan;
    }

    // Taxa de melhoria vs período anterior
    const improvement =
      previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : currentCount > 0
        ? 100
        : 0;

    // Melhor horário (moda das horas de início)
    const hourCounts: Record<number, number> = {};
    currentCompleted.forEach((h) => {
      try {
        const hour = parseInt(h.timeStart.split(':')[0], 10);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      } catch {}
    });

    let bestHour: number | null = null;
    let maxHourCount = 0;
    Object.entries(hourCounts).forEach(([hourStr, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        bestHour = parseInt(hourStr, 10);
      }
    });

    // Dias ativos no período
    const activeDaysSet = new Set(currentCompleted.map((h) => h.date));
    const activeDays = Math.max(1, activeDaysSet.size);
    const dailyAverage = (currentCount / activeDays).toFixed(1);

    // Dias Perfeitos (dias em que 100% dos hábitos foram completados)
    const habitsByDay: Record<string, typeof habits> = {};
    currentPeriodHabits.forEach((h) => {
      if (!habitsByDay[h.date]) habitsByDay[h.date] = [];
      habitsByDay[h.date].push(h);
    });
    const totalDaysWithHabits = Object.keys(habitsByDay).length;
    let perfectDaysCount = 0;
    Object.values(habitsByDay).forEach((dayHabits) => {
      if (dayHabits.length > 0 && dayHabits.every((h) => h.completed)) {
        perfectDaysCount++;
      }
    });

    // Categoria destaque
    const categoryCompletedCount: Record<string, number> = {};
    currentCompleted.forEach((h) => {
      categoryCompletedCount[h.categoryId] =
        (categoryCompletedCount[h.categoryId] || 0) + 1;
    });

    let bestCategoryId: string | null = null;
    let maxCategoryCount = 0;
    Object.entries(categoryCompletedCount).forEach(([catId, count]) => {
      if (count > maxCategoryCount) {
        maxCategoryCount = count;
        bestCategoryId = catId;
      }
    });

    const bestCategoryObj = categories.find((c) => c.id === bestCategoryId);

    // Dados do gráfico de barras para os últimos 7 dias se WEEK, ou categorias se MONTH/YEAR
    const chartBars: {
      label: string;
      fullLabel: string;
      count: number;
      total: number;
      dateStr?: string;
      color?: string;
      focusMins?: number;
    }[] = [];

    if (filter === 'WEEK') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;
        const dayLabel = d
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .toUpperCase()
          .replace('.', '');
        const fullLabel = d.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });
        const dayHabits = habits.filter((h) => h.date === dateStr);
        const count = dayHabits.filter((h) => h.completed).length;
        const total = dayHabits.length;
        const focusMins = focusHistoryMap[dateStr] || 0;

        chartBars.push({
          label: dayLabel,
          fullLabel,
          count,
          total,
          dateStr,
          focusMins,
        });
      }
    } else {
      categories.forEach((cat) => {
        const count = categoryCompletedCount[cat.id] || 0;
        const totalInCat = currentPeriodHabits.filter((h) => h.categoryId === cat.id).length;
        chartBars.push({
          label: cat.name.slice(0, 3).toUpperCase(),
          fullLabel: cat.name,
          count,
          total: totalInCat,
          color: cat.color,
        });
      });
    }

    const maxBarCount = Math.max(1, ...chartBars.map((b) => b.count));

    // Mini-heatmap dos últimos 30 dias quando filter === 'MONTH'
    const monthHeatmapDays: {
      dateStr: string;
      dayNum: number;
      count: number;
      total: number;
      rate: number;
      focusMins: number;
    }[] = [];

    if (filter === 'MONTH') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = d.getDate();
        const dateStr = `${y}-${m}-${String(dayNum).padStart(2, '0')}`;
        const dayHabits = habits.filter((h) => h.date === dateStr);
        const count = dayHabits.filter((h) => h.completed).length;
        const total = dayHabits.length;
        const rate = total > 0 ? Math.round((count / total) * 100) : 0;
        const focusMins = focusHistoryMap[dateStr] || 0;
        monthHeatmapDays.push({ dateStr, dayNum, count, total, rate, focusMins });
      }
    }

    // Taxa de conclusão por categoria considerando estritamente o período atual
    const categoryRates = categories
      .map((cat) => {
        const totalInCat = currentPeriodHabits.filter((h) => h.categoryId === cat.id).length;
        const completedHabitsInCat = currentPeriodHabits.filter((h) => h.categoryId === cat.id && h.completed);
        const completedInCat = completedHabitsInCat.length;
        const rate = totalInCat > 0 ? Math.round((completedInCat / totalInCat) * 100) : 0;

        let completedMins = 0;
        completedHabitsInCat.forEach((h) => {
          let dur = 30;
          if (h.timeStart && h.timeEnd) {
            const [sH, sM] = h.timeStart.split(':').map((v) => parseInt(v, 10) || 0);
            const [eH, eM] = h.timeEnd.split(':').map((v) => parseInt(v, 10) || 0);
            const diff = (eH * 60 + eM) - (sH * 60 + sM);
            if (diff > 0) dur = diff;
          }
          completedMins += dur;
        });

        const metaMinutosSemanal = cat.metaMinutosSemanal || null;
        const goalProgressRate = metaMinutosSemanal && metaMinutosSemanal > 0
          ? Math.min(100, Math.round((completedMins / metaMinutosSemanal) * 100))
          : 0;

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          completed: completedInCat,
          total: totalInCat,
          rate,
          completedMins,
          metaMinutosSemanal,
          goalProgressRate,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Cálculo dinâmico autêntico do tempo focado por período
    let periodFocusMinutes = 0;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (filter === 'WEEK') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${dayNum}`;
        periodFocusMinutes += (focusHistoryMap[dStr] || 0);
      }
    } else if (filter === 'MONTH') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${dayNum}`;
        periodFocusMinutes += (focusHistoryMap[dStr] || 0);
      }
    } else {
      const currentYearStr = String(now.getFullYear());
      Object.entries(focusHistoryMap).forEach(([dStr, mins]) => {
        if (dStr.startsWith(currentYearStr)) {
          periodFocusMinutes += mins;
        }
      });
    }

    // Se hoje tem foco no userProfile e ainda não foi computado no map
    if ((focusHistoryMap[todayStr] || 0) === 0 && (userProfile?.focusMinutesToday || 0) > 0) {
      periodFocusMinutes += userProfile.focusMinutesToday;
    }

    const focusFormatted =
      periodFocusMinutes >= 60
        ? `${Math.floor(periodFocusMinutes / 60)}h ${periodFocusMinutes % 60 > 0 ? `${periodFocusMinutes % 60}m` : ''}`.trim()
        : `${periodFocusMinutes} min`;

    // Streaks (Atual e Recorde Pessoal)
    const currentStreak = userProfile?.currentStreak || 0;
    const bestStreak = Math.max(userProfile?.bestStreak || 0, currentStreak);

    return {
      currentCount,
      totalPeriodHabits,
      overallCompletionRate,
      feedbackTitle,
      feedbackSubtitle,
      feedbackColor,
      improvement,
      bestHour: currentCount > 0 && bestHour !== null ? `${bestHour}h` : '--',
      dailyAverage,
      bestCategory: currentCount > 0 ? (bestCategoryObj?.name || 'Geral') : '--',
      chartBars,
      maxBarCount,
      monthHeatmapDays,
      categoryRates,
      perfectDaysCount,
      totalDaysWithHabits,
      focusFormatted,
      periodFocusMinutes,
      currentStreak,
      bestStreak,
    };
  }, [habits, categories, filter, filterDays, userProfile, focusHistoryMap, theme.primary]);

  // Estatísticas estritamente calculadas para a semana atual (7 dias) para o cartão Stories 9:16
  const storiesStats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const parseHabitDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    // Hábitos estritamente dos últimos 7 dias da semana
    const weekHabits = habits.filter((h) => {
      const d = parseHabitDate(h.date);
      return d >= sevenDaysAgo && d <= now;
    });

    const weekCompleted = weekHabits.filter((h) => h.completed);

    // Dias Perfeitos na semana (100% de hábitos cumpridos)
    const habitsByDay: Record<string, typeof habits> = {};
    weekHabits.forEach((h) => {
      if (!habitsByDay[h.date]) habitsByDay[h.date] = [];
      habitsByDay[h.date].push(h);
    });

    let perfectDaysCount = 0;
    Object.values(habitsByDay).forEach((dayHabits) => {
      if (dayHabits.length > 0 && dayHabits.every((h) => h.completed)) {
        perfectDaysCount++;
      }
    });

    // Categoria destaque da semana
    const catCounts: Record<string, number> = {};
    weekCompleted.forEach((h) => {
      catCounts[h.categoryId] = (catCounts[h.categoryId] || 0) + 1;
    });

    let topCatId: string | null = null;
    let maxCount = 0;
    Object.entries(catCounts).forEach(([catId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCatId = catId;
      }
    });
    const topCat = categories.find((c) => c.id === topCatId);

    const totalDaysWithHabits = Math.max(1, Object.keys(habitsByDay).length);
    const dailyAverage = (weekCompleted.length / totalDaysWithHabits).toFixed(1);

    return {
      perfectDaysCount,
      totalDaysWithHabits,
      currentCount: weekCompleted.length,
      focusFormatted: stats.focusFormatted,
      bestCategory: weekCompleted.length > 0 ? (topCat?.name || 'Geral') : '--',
      improvement: stats.improvement,
      dailyAverage,
    };
  }, [habits, categories, stats.focusFormatted, stats.improvement]);

  const selectedBarItem = useMemo(() => {
    if (selectedBarIndex === null || !stats.chartBars[selectedBarIndex]) {
      return null;
    }
    return stats.chartBars[selectedBarIndex];
  }, [selectedBarIndex, stats.chartBars]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Análise de Performance</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Insights de consistência e produtividade
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.headerShareBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
              onPress={() => setIsStoriesModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar resumo semanal nos stories">
              <Ionicons name="sparkles" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Seletor de Período */}
          <View
            style={[
              styles.filterRow,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            {(['WEEK', 'MONTH', 'YEAR'] as StatsFilter[]).map((f) => {
              const labels = { WEEK: 'Semana', MONTH: 'Mês', YEAR: 'Ano' };
              const isSelected = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    setFilter(f);
                    setSelectedBarIndex(null);
                    triggerHaptic('selection');
                  }}
                  style={[
                    styles.filterBtn,
                    isSelected && { backgroundColor: theme.primary },
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterText,
                      { color: isSelected ? getContrastTextColor(theme.primary) : theme.textSecondary },
                      isSelected && { fontWeight: '800' },
                    ]}>
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CARD HERO: Anel Neon de Aproveitamento Geral */}
          <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.heroLeftCol}>
              <CircularProgressRing
                progress={stats.overallCompletionRate / 100}
                size={96}
                strokeWidth={9}
                color={stats.feedbackColor}
              />
            </View>
            <View style={styles.heroRightCol}>
              <View
                style={[
                  styles.feedbackBadge,
                  {
                    backgroundColor: `${stats.feedbackColor}18`,
                    borderColor: `${stats.feedbackColor}40`,
                  },
                ]}>
                <Text style={[styles.feedbackBadgeText, { color: stats.feedbackColor }]}>
                  {stats.feedbackTitle}
                </Text>
              </View>
              <Text style={[styles.heroStatsMain, { color: theme.textPrimary }]}>
                {stats.currentCount}{' '}
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>
                  de {stats.totalPeriodHabits} rotinas concluídas
                </Text>
              </Text>
              <Text style={[styles.heroFeedbackSub, { color: theme.textSecondary }]}>
                {stats.feedbackSubtitle}
              </Text>
            </View>
          </View>

          {/* CARD DE SEQUÊNCIAS (Streak Atual vs Recorde Histórico) */}
          <View style={[styles.streakBlockCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.streakCol}>
              <View style={styles.streakColHeader}>
                <Ionicons name="flame" size={20} color="#FF5722" />
                <Text style={[styles.streakColLabel, { color: theme.textSecondary }]}>Sequência Atual</Text>
              </View>
              <Text style={[styles.streakColValue, { color: theme.textPrimary }]}>
                {stats.currentStreak} <Text style={styles.streakColUnit}>dias</Text>
              </Text>
              <Text style={[styles.streakColSub, { color: theme.textSecondary }]}>
                {stats.currentStreak > 0 ? 'Ritmo diário ativo 🔥' : 'Inicie hoje!'}
              </Text>
            </View>

            <View style={[styles.streakDivider, { backgroundColor: theme.outline }]} />

            <View style={styles.streakCol}>
              <View style={styles.streakColHeader}>
                <Ionicons name="trophy" size={20} color={MomentusColors.gold} />
                <Text style={[styles.streakColLabel, { color: theme.textSecondary }]}>Recorde Histórico</Text>
              </View>
              <Text style={[styles.streakColValue, { color: theme.textPrimary }]}>
                {stats.bestStreak} <Text style={styles.streakColUnit}>dias</Text>
              </Text>
              <Text style={[styles.streakColSub, { color: theme.textSecondary }]}>
                {stats.currentStreak >= stats.bestStreak && stats.currentStreak > 0
                  ? 'Recorde superado hoje! 🎉'
                  : 'Meta pessoal máxima'}
              </Text>
            </View>
          </View>

          {/* Cards de Métricas Principais */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Insights de {filter === 'WEEK' ? 'Semana' : filter === 'MONTH' ? 'Mês' : 'Ano'}
          </Text>

          <View style={styles.insightsRow}>
            {/* Card 1: Evolução / Melhoria */}
            <View
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.insightHeader}>
                <Ionicons
                  name={stats.improvement >= 0 ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={stats.improvement >= 0 ? theme.primary : MomentusColors.errorRed}
                />
                <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Evolução</Text>
              </View>
              <Text
                style={[
                  styles.insightValue,
                  { color: theme.textPrimary },
                  stats.improvement < 0 && { color: MomentusColors.errorRed },
                ]}>
                {stats.improvement > 0 ? `+${stats.improvement}%` : `${stats.improvement}%`}
              </Text>
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>Vs. período anterior</Text>
            </View>

            {/* Card 2: Horário Ápice */}
            <View
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.insightHeader}>
                <Ionicons name="time" size={20} color={MomentusColors.cyan} />
                <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Horário Ápice</Text>
              </View>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{stats.bestHour}</Text>
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>Maior produtividade</Text>
            </View>
          </View>

          <View style={styles.insightsRow}>
            {/* Card 3: Total Concluído */}
            <View
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.insightHeader}>
                <Ionicons name="checkmark-done-circle" size={20} color={theme.primary} />
                <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Concluídos</Text>
              </View>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{stats.currentCount}</Text>
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>Neste período</Text>
            </View>

            {/* Card 4: Categoria Top */}
            <View
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.insightHeader}>
                <Ionicons name="star" size={20} color={MomentusColors.gold} />
                <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Destaque</Text>
              </View>
              <Text numberOfLines={1} style={[styles.insightValueSmall, { color: theme.textPrimary }]}>
                {stats.bestCategory}
              </Text>
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>Maior consistência</Text>
            </View>
          </View>

          <View style={styles.insightsRow}>
            {/* Card 5: Dias Perfeitos (100% de Conclusão) */}
            <View
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.insightHeader}>
                <Ionicons name="trophy" size={20} color={MomentusColors.gold} />
                <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Dias Perfeitos</Text>
              </View>
              <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                {stats.perfectDaysCount}
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textSecondary }}>
                  {' '}/ {stats.totalDaysWithHabits}
                </Text>
              </Text>
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>100% de hábitos feitos</Text>
            </View>

            {/* Card 6: Tempo Total Focado */}
            <View
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.insightHeader}>
                <Ionicons name="timer-outline" size={20} color={MomentusColors.cyan} />
                <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>Tempo Focado</Text>
              </View>
              <Text numberOfLines={1} style={[styles.insightValue, { color: theme.textPrimary }]}>
                {stats.focusFormatted}
              </Text>
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>
                {filter === 'WEEK' ? 'Nesta semana' : filter === 'MONTH' ? 'Neste mês' : 'Neste ano'}
              </Text>
            </View>
          </View>

          {/* Gráfico de Barras com Toque Interativo */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
              {filter === 'WEEK' ? 'Conclusões da Semana' : 'Distribuição por Categoria'}
            </Text>
            {selectedBarItem && (
              <TouchableOpacity
                onPress={() => setSelectedBarIndex(null)}
                style={styles.clearSelectionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.clearSelectionText, { color: theme.primary }]}>Limpar seleção</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                {filter === 'WEEK' ? 'Hábitos Finalizados' : 'Hábitos por Categoria'}
              </Text>
              <Text style={[styles.chartAverage, { color: theme.primary }]}>
                {stats.currentCount > 0 ? `Média: ${stats.dailyAverage} / dia` : 'Sem registros'}
              </Text>
            </View>

            {stats.currentCount === 0 ? (
              <View style={[styles.emptyChartNotice, { backgroundColor: theme.surfaceElevated }]}>
                <Ionicons name="bar-chart-outline" size={32} color={theme.textSecondary} />
                <Text style={[styles.emptyChartNoticeTitle, { color: theme.textPrimary }]}>
                  Nenhum hábito concluído neste período
                </Text>
                <Text style={[styles.emptyChartNoticeSub, { color: theme.textSecondary }]}>
                  Complete suas rotinas do dia para desbloquear seus gráficos de performance!
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.barsContainerScroll,
                    {
                      minWidth: '100%',
                      justifyContent: stats.chartBars.length > 7 ? 'flex-start' : 'space-around',
                    },
                  ]}>
                  {stats.chartBars.map((item, index) => {
                    const heightPercent = Math.max(8, Math.round((item.count / stats.maxBarCount) * 100));
                    const isPeak = item.count === stats.maxBarCount && item.count > 0;
                    const isSelected = selectedBarIndex === index;
                    const barColor = item.color
                      ? item.color
                      : isSelected || isPeak
                      ? theme.primary
                      : theme.outline;

                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedBarIndex(index);
                          triggerHaptic('selection');
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.barCol,
                          stats.chartBars.length > 7 && { width: 52, flex: undefined },
                        ]}>
                        <Text
                          style={[
                            styles.barCountLabel,
                            {
                              color: isSelected ? theme.primary : theme.textSecondary,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}>
                          {item.count > 0 ? item.count : ''}
                        </Text>
                        <View
                          style={[
                            styles.barTrack,
                            {
                              backgroundColor: theme.surfaceElevated,
                              borderWidth: isSelected ? 1.5 : 0,
                              borderColor: theme.primary,
                            },
                          ]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${heightPercent}%`,
                                backgroundColor: barColor,
                                opacity: selectedBarIndex !== null && !isSelected ? 0.4 : 1,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.barDayText,
                            (isSelected || (isPeak && !item.color)) && { color: theme.primary, fontWeight: '800' },
                            item.color && !isSelected && { color: theme.textSecondary, fontWeight: isPeak ? '800' : '600' },
                          ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Mini-Card Interativo de Detalhes da Barra Selecionada */}
                {selectedBarItem && (
                  <View style={[styles.selectedBarCard, { backgroundColor: theme.surfaceElevated, borderColor: `${theme.primary}50` }]}>
                    <View style={styles.selectedBarHeader}>
                      <View style={styles.selectedBarTitleRow}>
                        <View style={[styles.selectedBarDot, { backgroundColor: selectedBarItem.color || theme.primary }]} />
                        <Text style={[styles.selectedBarTitle, { color: theme.textPrimary }]}>
                          {selectedBarItem.fullLabel}
                        </Text>
                      </View>
                      <Text style={[styles.selectedBarBadge, { color: theme.primary }]}>
                        {selectedBarItem.total > 0
                          ? `${Math.round((selectedBarItem.count / selectedBarItem.total) * 100)}% concluído`
                          : `${selectedBarItem.count} feito`}
                      </Text>
                    </View>
                    <View style={styles.selectedBarDetailsRow}>
                      <Text style={[styles.selectedBarSub, { color: theme.textSecondary }]}>
                        {selectedBarItem.count} de {selectedBarItem.total} rotinas cumpridas
                      </Text>
                      {typeof selectedBarItem.focusMins === 'number' && selectedBarItem.focusMins > 0 && (
                        <Text style={[styles.selectedBarFocusSub, { color: MomentusColors.cyan }]}>
                          ⏱ {selectedBarItem.focusMins} min de foco
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Mini-Heatmap dos Últimos 30 Dias (quando filter === 'MONTH') */}
          {filter === 'MONTH' && stats.monthHeatmapDays.length > 0 && (
            <View style={[styles.heatmapCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <View style={styles.heatmapHeader}>
                <View style={styles.heatmapHeaderTitleRow}>
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                  <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                    Frequência dos Últimos 30 Dias
                  </Text>
                </View>
                <Text style={[styles.heatmapSubtitle, { color: theme.textSecondary }]}>
                  Mapa de calor de consistência diária
                </Text>
              </View>

              <View style={styles.heatmapGrid}>
                {stats.monthHeatmapDays.map((d, idx) => {
                  let cellColor = theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
                  if (d.rate === 100 && d.count > 0) {
                    cellColor = theme.primary;
                  } else if (d.rate >= 60) {
                    cellColor = `${theme.primary}B0`;
                  } else if (d.rate > 0) {
                    cellColor = `${theme.primary}60`;
                  }

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor: cellColor,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.heatmapCellDay,
                          {
                            color: d.rate >= 60 ? getContrastTextColor(theme.primary) : theme.textSecondary,
                            fontWeight: d.rate >= 60 ? '800' : '500',
                          },
                        ]}>
                        {d.dayNum}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.heatmapLegendRow}>
                <Text style={[styles.heatmapLegendLabel, { color: theme.textSecondary }]}>Sem hábitos</Text>
                <View style={styles.heatmapLegendBoxes}>
                  <View style={[styles.legendBox, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' }]} />
                  <View style={[styles.legendBox, { backgroundColor: `${theme.primary}60` }]} />
                  <View style={[styles.legendBox, { backgroundColor: `${theme.primary}B0` }]} />
                  <View style={[styles.legendBox, { backgroundColor: theme.primary }]} />
                </View>
                <Text style={[styles.heatmapLegendLabel, { color: theme.textSecondary }]}>100% feito</Text>
              </View>
            </View>
          )}

          {/* Banner de Compartilhamento Stories 9:16 */}
          <TouchableOpacity
            style={[
              styles.shareBanner,
              {
                backgroundColor: theme.surface,
                borderColor: `${theme.primary}40`,
              },
            ]}
            onPress={() => setIsStoriesModalOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Abrir resumo em Stories 9:16">
            <View style={styles.shareBannerLeft}>
              <View style={[styles.shareIconBox, { backgroundColor: `${theme.primary}18` }]}>
                <Ionicons name="sparkles" size={20} color={theme.primary} />
              </View>
              <View style={styles.shareBannerTextCol}>
                <View style={styles.shareBannerTitleRow}>
                  <Text style={[styles.shareBannerTitle, { color: theme.textPrimary }]}>
                    Resumo Visual da Semana
                  </Text>
                  <View
                    style={[
                      styles.storiesPill,
                      {
                        backgroundColor: `${MomentusColors.gold}20`,
                        borderColor: `${MomentusColors.gold}50`,
                      },
                    ]}>
                    <Text style={[styles.storiesPillText, { color: MomentusColors.gold }]}>
                      STORIES 9:16
                    </Text>
                  </View>
                </View>
                <Text style={[styles.shareBannerSub, { color: theme.textSecondary }]}>
                  Compartilhe sua evolução no Instagram e WhatsApp
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Taxas por Categoria */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Metas por Categoria</Text>
          <View style={[styles.categoriesProgressCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            {stats.categoryRates.filter((cat) => cat.total > 0).length === 0 ? (
              <View style={styles.emptyCatContainer}>
                <Ionicons name="folder-open-outline" size={28} color={theme.textSecondary} />
                <Text style={[styles.emptyCatText, { color: theme.textSecondary }]}>
                  Nenhuma categoria com hábitos agendados neste período.
                </Text>
              </View>
            ) : (
              stats.categoryRates
                .filter((cat) => cat.total > 0)
                .map((cat) => (
                  <View key={cat.id} style={styles.catProgressItem}>
                    <View style={styles.catProgressHeader}>
                      <View style={styles.catNameWithDot}>
                        <View style={[styles.catSmallDot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.catProgressTitle, { color: theme.textPrimary }]}>{cat.name}</Text>
                      </View>
                      <Text style={[styles.catProgressPercent, { color: cat.color }]}>
                        {cat.rate}% ({cat.completed}/{cat.total})
                      </Text>
                    </View>

                    <View style={[styles.catProgressBarTrack, { backgroundColor: theme.surfaceElevated }]}>
                      <View
                        style={[
                          styles.catProgressBarFill,
                          { width: `${cat.rate}%`, backgroundColor: cat.color },
                        ]}
                      />
                    </View>

                    {/* Meta Semanal de Tempo se Configurada */}
                    {cat.metaMinutosSemanal && cat.metaMinutosSemanal > 0 && (
                      <View style={styles.catMetaSubRow}>
                        <View style={styles.catMetaSubLeft}>
                          <Ionicons
                            name={cat.completedMins >= cat.metaMinutosSemanal ? 'trophy' : 'flag-outline'}
                            size={12}
                            color={cat.completedMins >= cat.metaMinutosSemanal ? MomentusColors.gold : (cat.color || theme.primary)}
                          />
                          <Text style={[styles.catMetaSubText, { color: theme.textSecondary }]}>
                            Meta Semanal:{' '}
                            <Text style={{ fontWeight: '700', color: theme.textPrimary }}>
                              {Math.floor(cat.completedMins / 60)}h {cat.completedMins % 60}m / {Math.floor(cat.metaMinutosSemanal / 60)}h{cat.metaMinutosSemanal % 60 > 0 ? ` ${cat.metaMinutosSemanal % 60}m` : ''}
                            </Text>
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.catMetaSubPercent,
                            {
                              color:
                                cat.completedMins >= cat.metaMinutosSemanal
                                  ? MomentusColors.gold
                                  : (cat.color || theme.primary),
                            },
                          ]}>
                          {cat.goalProgressRate}% {cat.completedMins >= cat.metaMinutosSemanal ? '🏆' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal de Resumo Semanal Stories 9:16 */}
        <WeeklySummaryModal
          visible={isStoriesModalOpen}
          onClose={() => setIsStoriesModalOpen(false)}
          stats={storiesStats}
          userProfile={userProfile}
          userLevel={userLevel}
          primaryColor={theme.primary}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    marginBottom: 16,
  },
  title: {
    ...TypographyTokens.screenTitle,
    color: MomentusColors.textPrimary,
  },
  subtitle: {
    ...TypographyTokens.screenSubtitle,
    color: MomentusColors.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: BorderRadiusTokens.input,
    padding: 4,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    marginBottom: 20,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadiusTokens.sm,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: MomentusColors.emeraldNeon,
  },
  filterText: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
  },
  insightsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
  },
  insightValueSmall: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  insightSub: {
    fontSize: 11,
  },
  chartCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartAverage: {
    fontSize: 12,
    fontWeight: '600',
  },
  barsContainerScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  barCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MomentusColors.textSecondary,
    height: 14,
  },
  barTrack: {
    width: 14,
    height: 96,
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDayText: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyChartNotice: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  emptyChartNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyChartNoticeSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  categoriesProgressCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  emptyCatContainer: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCatText: {
    fontSize: 13,
    textAlign: 'center',
  },
  catProgressItem: {
    gap: 6,
  },
  catProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catNameWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catSmallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catProgressTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  catProgressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  catProgressBarTrack: {
    height: 6,
    backgroundColor: MomentusColors.navyOutline,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catMetaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 3,
  },
  catMetaSubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catMetaSubText: {
    fontSize: 11,
  },
  catMetaSubPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  shareBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shareIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBannerTextCol: {
    flex: 1,
    gap: 2,
  },
  shareBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  storiesPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  storiesPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shareBannerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Card Hero: Anel Neon
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroLeftCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRightCol: {
    flex: 1,
    gap: 4,
  },
  feedbackBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 2,
  },
  feedbackBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroStatsMain: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroFeedbackSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Card de Sequências (Streak Atual vs Recorde)
  streakBlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  streakCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  streakColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakColLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  streakColValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  streakColUnit: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.7,
  },
  streakColSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  streakDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 8,
  },
  // Header do Gráfico e Seleção
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  clearSelectionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearSelectionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedBarCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  selectedBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  selectedBarBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  selectedBarDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  selectedBarSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectedBarFocusSub: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Heatmap dos 30 dias
  heatmapCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    gap: 12,
  },
  heatmapHeader: {
    gap: 2,
  },
  heatmapHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heatmapSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  heatmapCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapCellDay: {
    fontSize: 11,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  heatmapLegendLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  heatmapLegendBoxes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
