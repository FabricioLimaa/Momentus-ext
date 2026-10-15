import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

type StatsFilter = 'WEEK' | 'MONTH' | 'YEAR';

export default function StatsScreen() {
  const { habits, categories, theme } = useMomentus();
  const [filter, setFilter] = useState<StatsFilter>('WEEK');

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

    const currentCompleted = habits.filter((h) => {
      if (!h.completed) return false;
      const d = parseHabitDate(h.date);
      return d >= sinceDate && d <= now;
    });

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

    // Taxa de conclusão por categoria
    const categoryRates = categories.map((cat) => {
      const totalInCat = habits.filter((h) => h.categoryId === cat.id).length;
      const completedInCat = habits.filter((h) => h.categoryId === cat.id && h.completed).length;
      const rate = totalInCat > 0 ? Math.round((completedInCat / totalInCat) * 100) : 0;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        completed: completedInCat,
        total: totalInCat,
        rate,
      };
    });

    return {
      currentCount,
      improvement,
      bestHour: bestHour !== null ? `${bestHour}h` : '08h',
      dailyAverage,
      bestCategory: bestCategoryObj?.name || 'Geral',
      chartBars,
      maxBarCount,
      categoryRates,
    };
  }, [habits, categories, filter, filterDays]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Análise de Performance</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Insights de consistência e produtividade
          </Text>
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
                      { color: isSelected ? '#000000' : theme.textSecondary },
                      isSelected && { fontWeight: '800' },
                    ]}>
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="time" size={20} color={MomentusColors.cyan} />
                <Text style={styles.insightLabel}>Horário Ápice</Text>
              </View>
              <Text style={styles.insightValue}>{stats.bestHour}</Text>
              <Text style={styles.insightSub}>Maior produtividade</Text>
            </View>
          </View>

          <View style={styles.insightsRow}>
            {/* Card 3: Total Concluído */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="checkmark-done-circle" size={20} color={MomentusColors.emeraldNeon} />
                <Text style={styles.insightLabel}>Concluídos</Text>
              </View>
              <Text style={styles.insightValue}>{stats.currentCount}</Text>
              <Text style={styles.insightSub}>Neste período</Text>
            </View>

            {/* Card 4: Categoria Top */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="star" size={20} color={MomentusColors.gold} />
                <Text style={styles.insightLabel}>Destaque</Text>
              </View>
              <Text numberOfLines={1} style={styles.insightValueSmall}>
                {stats.bestCategory}
              </Text>
              <Text style={styles.insightSub}>Maior consistência</Text>
            </View>
          </View>

          {/* Gráfico de Barras */}
          <Text style={styles.sectionTitle}>Conclusões por Período</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Hábitos Finalizados</Text>
              <Text style={styles.chartAverage}>Média: {stats.dailyAverage} / dia</Text>
            </View>

            <View style={styles.barsContainer}>
              {stats.chartBars.map((item, index) => {
                const heightPercent = Math.max(8, Math.round((item.count / stats.maxBarCount) * 100));
                const isPeak = item.count === stats.maxBarCount && item.count > 0;

                return (
                  <View key={index} style={styles.barCol}>
                    <Text style={styles.barCountLabel}>
                      {item.count > 0 ? item.count : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: isPeak
                              ? MomentusColors.emeraldNeon
                              : item.color || MomentusColors.navyOutline,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barDayText,
                        isPeak && { color: MomentusColors.emeraldNeon, fontWeight: '800' },
                      ]}>
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Taxas por Categoria */}
          <Text style={styles.sectionTitle}>Metas por Categoria</Text>
          <View style={styles.categoriesProgressCard}>
            {stats.categoryRates.map((cat) => (
              <View key={cat.id} style={styles.catProgressItem}>
                <View style={styles.catProgressHeader}>
                  <View style={styles.catNameWithDot}>
                    <View style={[styles.catSmallDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.catProgressTitle}>{cat.name}</Text>
                  </View>
                  <Text style={[styles.catProgressPercent, { color: cat.color }]}>
                    {cat.rate}% ({cat.completed}/{cat.total})
                  </Text>
                </View>

                <View style={styles.catProgressBarTrack}>
                  <View
                    style={[
                      styles.catProgressBarFill,
                      { width: `${cat.rate}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    marginBottom: 20,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
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
    color: MomentusColors.emeraldNeon,
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
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  insightValue: {
    color: MomentusColors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
  },
  insightValueSmall: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  insightSub: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
  },
  chartCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
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
    color: MomentusColors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartAverage: {
    color: MomentusColors.emeraldNeon,
    fontSize: 12,
    fontWeight: '600',
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
  categoriesProgressCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 18,
    gap: 16,
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
});
