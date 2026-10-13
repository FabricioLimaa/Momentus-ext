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
import { LevelProgressBar } from '@/components/momentus/LevelProgressBar';
import { StreakCard } from '@/components/momentus/StreakCard';
import { HabitItemCard } from '@/components/momentus/HabitItemCard';
import { NewHabitModal } from '@/components/momentus/NewHabitModal';
import { getTodayDateString } from '@/constants/initialData';

export default function HomeScreen() {
  const { habits, categories, toggleHabit, deleteHabit } = useMomentus();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const todayHabits = habits.filter((h) => h.date === todayStr);

  const filteredHabits = selectedFilterCategory
    ? todayHabits.filter((h) => h.categoryId === selectedFilterCategory)
    : todayHabits;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Header & Level Info */}
          <LevelProgressBar />

          {/* Streak & Today Motivation Card */}
          <StreakCard />

          {/* Category Filter Pills */}
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                onPress={() => setSelectedFilterCategory(null)}
                style={[
                  styles.filterPill,
                  selectedFilterCategory === null && styles.filterPillActive,
                ]}>
                <Text
                  style={[
                    styles.filterPillText,
                    selectedFilterCategory === null && styles.filterPillTextActive,
                  ]}>
                  Todas ({todayHabits.length})
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => {
                const count = todayHabits.filter((h) => h.categoryId === cat.id).length;
                const isActive = selectedFilterCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedFilterCategory(isActive ? null : cat.id)}
                    style={[
                      styles.filterPill,
                      isActive && {
                        backgroundColor: `${cat.color}25`,
                        borderColor: cat.color,
                      },
                    ]}>
                    <View style={[styles.filterDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive && { color: cat.color, fontWeight: '700' },
                      ]}>
                      {cat.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Habit List Header */}
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Rotinas de Hoje</Text>
              <Text style={styles.sectionSubtitle}>
                {todayHabits.filter((h) => h.completed).length} de {todayHabits.length} concluídas
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={styles.quickAddBtn}>
              <Ionicons name="add" size={18} color="#0F172A" />
              <Text style={styles.quickAddText}>Novo</Text>
            </TouchableOpacity>
          </View>

          {/* Habit Items */}
          {filteredHabits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={MomentusColors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma rotina encontrada</Text>
              <Text style={styles.emptyText}>
                Toque no botão &quot;Novo&quot; ou aplique um modelo na aba de Templates.
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.emptyAddBtn}>
                <Ionicons name="add-circle-outline" size={20} color={MomentusColors.emeraldNeon} />
                <Text style={styles.emptyAddBtnText}>Adicionar Rotina</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredHabits.map((habit) => {
              const category = categories.find((c) => c.id === habit.categoryId);
              return (
                <HabitItemCard
                  key={habit.id}
                  habit={habit}
                  category={category}
                  onToggle={toggleHabit}
                  onDelete={deleteHabit}
                />
              );
            })
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.fab}
          activeOpacity={0.8}>
          <Ionicons name="add" size={30} color="#0F172A" />
        </TouchableOpacity>

        {/* Modal for adding new habit */}
        <NewHabitModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: MomentusColors.emeraldNeon,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterPillText: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  quickAddText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyContainer: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: MomentusColors.emeraldNeon,
  },
  emptyAddBtnText: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '600',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: MomentusColors.emeraldNeon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
