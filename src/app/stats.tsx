import React, { useState } from 'react';
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
  const { habits, categories, userProfile } = useMomentus();
  const [filter, setFilter] = useState<StatsFilter>('WEEK');

  // Dias da semana para o gráfico de barras
  const weekDays = [
    { day: 'SEG', count: 4, height: 70 },
    { day: 'TER', count: 6, height: 95 },
    { day: 'QUA', count: 5, height: 80 },
    { day: 'QUI', count: 7, height: 100 },
    { day: 'SEX', count: 5, height: 80 },
    { day: 'SÁB', count: 3, height: 50 },
    { day: 'DOM', count: 4, height: 65 },
  ];

  const totalCompletedHabits = habits.filter((h) => h.completed).length;
  const completionRate = habits.length > 0 ? Math.round((totalCompletedHabits / habits.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Análise de Performance</Text>
          <Text style={styles.subtitle}>Insights de consistência e produtividade</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Period Filter Buttons */}
          <View style={styles.filterRow}>
            {(['WEEK', 'MONTH', 'YEAR'] as StatsFilter[]).map((f) => {
              const labels = { WEEK: 'Semana', MONTH: 'Mês', YEAR: 'Ano' };
              const isSelected = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.filterBtn, isSelected && styles.filterBtnActive]}>
                  <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                    {labels[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: Insights Cards */}
          <Text style={styles.sectionTitle}>
            Insights de {filter === 'WEEK' ? 'Semana' : filter === 'MONTH' ? 'Mês' : 'Ano'}
          </Text>

          <View style={styles.insightsRow}>
            {/* Card 1: Evolução */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="trending-up" size={20} color={MomentusColors.emeraldNeon} />
                <Text style={styles.insightLabel}>Evolução</Text>
              </View>
              <Text style={styles.insightValue}>+24%</Text>
              <Text style={styles.insightSub}>Vs. período anterior</Text>
            </View>

            {/* Card 2: Horário Ápice */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="time" size={20} color={MomentusColors.cyan} />
                <Text style={styles.insightLabel}>Horário Ápice</Text>
              </View>
              <Text style={styles.insightValue}>18h</Text>
              <Text style={styles.insightSub}>Maior produtividade</Text>
            </View>
          </View>

          {/* Section: Conclusões por Período (Bar Chart) */}
          <Text style={styles.sectionTitle}>Conclusões por Período</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Hábitos Finalizados</Text>
              <Text style={styles.chartAverage}>Média: 4.8 / dia</Text>
            </View>

            <View style={styles.barsContainer}>
              {weekDays.map((item, index) => {
                const isPeak = item.count === 7;
                return (
                  <View key={index} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${item.height}%`,
                            backgroundColor: isPeak ? MomentusColors.emeraldNeon : MomentusColors.navyOutline,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barDayText, isPeak && { color: MomentusColors.emeraldNeon, fontWeight: 'bold' }]}>
                      {item.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section: Taxa por Categoria */}
          <Text style={styles.sectionTitle}>Metas por Categoria</Text>
          <View style={styles.categoriesProgressCard}>
            {categories.map((cat) => {
              const meta = cat.metaMinutosSemanal || 120;
              const catHabits = habits.filter((h) => h.categoryId === cat.id);
              const catCompleted = catHabits.filter((h) => h.completed).length;
              const percent = catHabits.length > 0 ? Math.round((catCompleted / catHabits.length) * 100) : 50;

              return (
                <View key={cat.id} style={styles.catProgressItem}>
                  <View style={styles.catProgressHeader}>
                    <View style={styles.catNameWithDot}>
                      <View style={[styles.catSmallDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.catProgressTitle}>{cat.name}</Text>
                    </View>
                    <Text style={[styles.catProgressPercent, { color: cat.color }]}>
                      {percent}% ({catCompleted}/{catHabits.length})
                    </Text>
                  </View>

                  <View style={styles.catProgressBarTrack}>
                    <View
                      style={[
                        styles.catProgressBarFill,
                        { width: `${percent}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
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
    paddingTop: 12,
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
    marginBottom: 20,
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
  insightSub: {
    color: MomentusColors.textMuted,
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
    gap: 8,
  },
  barTrack: {
    width: 14,
    height: 110,
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

