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
import { HabitItemCard } from '@/components/momentus/HabitItemCard';
import { NewHabitModal } from '@/components/momentus/NewHabitModal';
import { getTodayDateString } from '@/constants/initialData';

export default function CalendarScreen() {
  const { habits, categories, toggleHabit, deleteHabit, selectedDate, setSelectedDate } = useMomentus();
  const [modalVisible, setModalVisible] = useState(false);

  // Generate 14 days around today (7 days before, 7 days after)
  const generateDatesStrip = () => {
    const list = [];
    const base = new Date();
    for (let i = -3; i <= 6; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNumber = d.getDate();
      list.push({ dateStr, dayName, dayNumber });
    }
    return list;
  };

  const dates = generateDatesStrip();
  const todayStr = getTodayDateString();

  const habitsForDate = habits.filter((h) => h.date === selectedDate);
  const completedCount = habitsForDate.filter((h) => h.completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Agenda & Rotinas</Text>
          <Text style={styles.subtitle}>
            Sincronizado com seus blocos e metas
          </Text>
        </View>

        {/* Horizontal Calendar Strip */}
        <View style={styles.stripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripScroll}>
            {dates.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              const isToday = todayStr === item.dateStr;
              return (
                <TouchableOpacity
                  key={item.dateStr}
                  onPress={() => setSelectedDate(item.dateStr)}
                  style={[
                    styles.dateBox,
                    isSelected && styles.dateBoxSelected,
                    isToday && !isSelected && styles.dateBoxToday,
                  ]}>
                  <Text
                    style={[
                      styles.dayName,
                      isSelected && styles.dayNameSelected,
                      isToday && !isSelected && { color: MomentusColors.emeraldNeon },
                    ]}>
                    {item.dayName.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                    ]}>
                    {item.dayNumber}
                  </Text>
                  {isToday && <View style={styles.todayIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Date Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Ionicons name="calendar" size={24} color={MomentusColors.emeraldNeon} />
            <View>
              <Text style={styles.summaryDateText}>
                {selectedDate === todayStr ? 'Hoje' : selectedDate}
              </Text>
              <Text style={styles.summaryHabitsCount}>
                {completedCount} de {habitsForDate.length} atividades finalizadas
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Habit List for Date */}
        <ScrollView
          style={styles.habitsScroll}
          contentContainerStyle={styles.habitsContent}
          showsVerticalScrollIndicator={false}>
          {habitsForDate.length === 0 ? (
            <View style={styles.emptyView}>
              <Ionicons name="sparkles-outline" size={42} color={MomentusColors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum evento neste dia</Text>
              <Text style={styles.emptySubtitle}>
                Aproveite o tempo livre ou adicione uma nova rotina.
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.emptyActionBtn}>
                <Ionicons name="add-circle" size={18} color={MomentusColors.emeraldNeon} />
                <Text style={styles.emptyActionText}>Criar para esta data</Text>
              </TouchableOpacity>
            </View>
          ) : (
            habitsForDate.map((habit) => {
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
          <View style={{ height: 40 }} />
        </ScrollView>

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
  stripContainer: {
    marginBottom: 16,
  },
  stripScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dateBox: {
    width: 62,
    height: 78,
    borderRadius: 18,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dateBoxSelected: {
    backgroundColor: MomentusColors.emeraldNeon,
    borderColor: MomentusColors.emeraldNeon,
  },
  dateBoxToday: {
    borderColor: MomentusColors.emeraldNeon,
  },
  dayName: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#0F172A',
  },
  dayNumber: {
    color: MomentusColors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayNumberSelected: {
    color: '#0F172A',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MomentusColors.emeraldNeon,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryDateText: {
    color: MomentusColors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  summaryHabitsCount: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  habitsScroll: {
    flex: 1,
  },
  habitsContent: {
    paddingHorizontal: 20,
  },
  emptyView: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  emptyActionText: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '600',
    fontSize: 13,
  },
});

