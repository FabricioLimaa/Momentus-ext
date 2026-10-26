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

type StatsFilter = 'WEEK' | 'MONTH' | 'YEAR';

export default function StatsScreen() {
  const { habits, categories, theme, userProfile, userLevel } = useMomentus();
  const [filter, setFilter] = useState<StatsFilter>('WEEK');
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
    const previousCount = previousCompleted.length;

    // Taxa de melhoria
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
    const chartBars: { label: string; count: number; dateStr?: string; color?: string }[] = [];
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
        const count = habits.filter((h) => h.date === dateStr && h.completed).length;
        chartBars.push({ label: dayLabel, count, dateStr });
      }
    } else {
      categories.forEach((cat) => {
        const count = categoryCompletedCount[cat.id] || 0;
        chartBars.push({ label: cat.name.slice(0, 3).toUpperCase(), count, color: cat.color });
      });
    }

    const maxBarCount = Math.max(1, ...chartBars.map((b) => b.count));

    // Taxa de conclusão por categoria considerando estritamente o período atual
    const categoryRates = categories
      .map((cat) => {
        const totalInCat = currentPeriodHabits.filter((h) => h.categoryId === cat.id).length;
        const completedInCat = currentPeriodHabits.filter((h) => h.categoryId === cat.id && h.completed).length;
        const rate = totalInCat > 0 ? Math.round((completedInCat / totalInCat) * 100) : 0;
        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          completed: completedInCat,
          total: totalInCat,
          rate,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Formatação amigável do tempo de foco acumulado
    const focusMinutes = userProfile?.focusMinutesToday || 0;
    const focusFormatted =
      focusMinutes >= 60
        ? `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60 > 0 ? `${focusMinutes % 60}m` : ''}`.trim()
        : `${focusMinutes} min`;

    return {
      currentCount,
      improvement,
      bestHour: currentCount > 0 && bestHour !== null ? `${bestHour}h` : '--',
      dailyAverage,
      bestCategory: currentCount > 0 ? (bestCategoryObj?.name || 'Geral') : '--',
      chartBars,
      maxBarCount,
      categoryRates,
      perfectDaysCount,
      totalDaysWithHabits,
      focusFormatted,
      focusMinutes,
    };
  }, [habits, categories, filter, filterDays, userProfile?.focusMinutesToday]);

  const storiesStats = useMemo(() => {
    const periodLabel =
      filter === 'WEEK'
        ? 'Semana Atual'
        : filter === 'MONTH'
        ? 'Mês Atual'
        : 'Ano Atual';

    return {
      periodLabel,
      perfectDaysCount: stats.perfectDaysCount,
      totalDaysWithHabits: stats.totalDaysWithHabits,
      currentCount: stats.currentCount,
      focusFormatted: stats.focusFormatted,
      bestCategory: stats.bestCategory,
      improvement: stats.improvement,
      dailyAverage: stats.dailyAverage,
    };
  }, [filter, stats]);

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
                  onPress={() => setFilter(f)}
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
                    Resumo da Semana
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
                  Gere seu cartão visual para Instagram e WhatsApp
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

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
              <Text style={[styles.insightSub, { color: theme.textSecondary }]}>Foco de hoje</Text>
            </View>
          </View>

          {/* Gráfico de Barras */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Conclusões por Período</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Hábitos Finalizados</Text>
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
                  // Quando exibe categorias (item.color existe), preserva a cor da categoria mesmo em caso de empate
                  const barColor = item.color
                    ? item.color
                    : isPeak
                    ? theme.primary
                    : theme.outline;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.barCol,
                        stats.chartBars.length > 7 && { width: 52, flex: undefined },
                      ]}>
                      <Text style={[styles.barCountLabel, { color: theme.textSecondary }]}>
                        {item.count > 0 ? item.count : ''}
                      </Text>
                      <View style={[styles.barTrack, { backgroundColor: theme.surfaceElevated }]}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${heightPercent}%`,
                              backgroundColor: barColor,
                              borderWidth: isPeak && item.color ? 1.5 : 0,
                              borderColor: theme.surface,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.barDayText,
                          isPeak && !item.color && { color: theme.primary, fontWeight: '800' },
                          item.color && { color: theme.textSecondary, fontWeight: isPeak ? '800' : '600' },
                        ]}>
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

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
});
