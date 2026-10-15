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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { TimelineEventItem } from '@/components/momentus/TimelineEventItem';
import { EventDetailDialog } from '@/components/momentus/EventDetailDialog';
import { NewHabitModal } from '@/components/momentus/NewHabitModal';
import { getTodayDateString } from '@/constants/initialData';
import { HabitItem } from '@/types';

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export default function CalendarScreen() {
  const {
    habits,
    categories,
    selectedDate,
    setSelectedDate,
    toggleHabit,
    deleteHabit,
    theme,
  } = useMomentus();

  const [isMonthView, setIsMonthView] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] = useState<HabitItem | null>(null);

  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const todayStr = getTodayDateString();

  // Rotinas da data selecionada ordenadas por horário
  const habitsForDate = useMemo(() => {
    return habits
      .filter((h) => h.date === selectedDate)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [habits, selectedDate]);

  const completedCount = habitsForDate.filter((h) => h.completed).length;

  // Fita de datas (14 dias em torno de hoje)
  const stripDates = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = -4; i <= 9; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      list.push({ dateStr, dayName, dayNumber: d.getDate() });
    }
    return list;
  }, []);

  // Grid mensal
  const { year, month } = currentYearMonth;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  }, [year, month, firstDayOfWeek, totalDays]);

  const prevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDeleteSingle = (habit: HabitItem) => {
    Alert.alert(
      'Excluir Rotina',
      'Deseja realmente remover esta rotina? Esta ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteHabit(habit.id);
            setSelectedDetailHabit(null);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header com alternância Mensal / Semanal */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Agenda & Rotinas</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Sincronizado com seus blocos e metas
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.toggleViewBtn,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}
            onPress={() => setIsMonthView(!isMonthView)}
            activeOpacity={0.7}>
            <Ionicons
              name={isMonthView ? 'calendar-outline' : 'grid-outline'}
              size={18}
              color={theme.primary}
            />
            <Text style={[styles.toggleViewText, { color: theme.primary }]}>
              {isMonthView ? 'Semana' : 'Mês'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Visão Mensal ou Visão de Fita Semanal */}
        {isMonthView ? (
          <View
            style={[
              styles.monthCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            <View style={styles.monthHeaderRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: theme.textPrimary }]}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
                <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysHeader}>
              {WEEKDAYS.map((w, idx) => (
                <Text key={idx} style={[styles.weekdayHeaderText, { color: theme.textSecondary }]}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarDays.map((item, index) => {
                if (!item) {
                  return <View key={`blank-${index}`} style={styles.dayGridCell} />;
                }
                const isSelected = selectedDate === item.dateStr;
                const isToday = todayStr === item.dateStr;
                const hasEvents = habits.some((h) => h.date === item.dateStr);

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    onPress={() => setSelectedDate(item.dateStr)}
                    style={[
                      styles.dayGridCell,
                      isSelected && { backgroundColor: theme.primary },
                      isToday && !isSelected && { borderColor: theme.primary, borderWidth: 1 },
                    ]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.dayGridText,
                        { color: isSelected ? '#000000' : theme.textPrimary },
                        isToday && !isSelected && { color: theme.primary, fontWeight: 'bold' },
                      ]}>
                      {item.dayNumber}
                    </Text>
                    {hasEvents && !isSelected && (
                      <View style={[styles.hasEventsDot, { backgroundColor: theme.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.stripContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stripScroll}>
              {stripDates.map((item) => {
                const isSelected = selectedDate === item.dateStr;
                const isToday = todayStr === item.dateStr;
                const hasEvents = habits.some((h) => h.date === item.dateStr);

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    onPress={() => setSelectedDate(item.dateStr)}
                    style={[
                      styles.dateBox,
                      { backgroundColor: theme.surface, borderColor: theme.outline },
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                      isToday && !isSelected && { borderColor: theme.primary },
                    ]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.dayName,
                        { color: theme.textSecondary },
                        isSelected && { color: '#000000', fontWeight: '800' },
                        isToday && !isSelected && { color: theme.primary },
                      ]}>
                      {item.dayName.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: theme.textPrimary },
                        isSelected && { color: '#000000', fontWeight: '900' },
                      ]}>
                      {item.dayNumber}
                    </Text>
                    {hasEvents && (
                      <View
                        style={[
                          styles.todayIndicator,
                          isSelected && { backgroundColor: '#000000' },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Resumo do Dia Selecionado */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.surface, borderColor: theme.outline },
          ]}>
          <View style={styles.summaryLeft}>
            <View style={[styles.summaryIconBox, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name="calendar" size={20} color={theme.primary} />
            </View>
            <View>
              <Text style={[styles.summaryDateText, { color: theme.textPrimary }]}>
                {selectedDate === todayStr ? 'Hoje' : selectedDate}
              </Text>
              <Text style={[styles.summaryHabitsCount, { color: theme.textSecondary }]}>
                {completedCount} de {habitsForDate.length} atividades finalizadas
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              setHabitToEdit(null);
              setModalVisible(true);
            }}
            style={styles.addBtn}
            activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Vertical para a data */}
        <ScrollView
          style={styles.habitsScroll}
          contentContainerStyle={styles.habitsContent}
          showsVerticalScrollIndicator={false}>
          {habitsForDate.length === 0 ? (
            <View style={styles.emptyView}>
              <Ionicons name="sparkles-outline" size={42} color={MomentusColors.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhum evento neste dia</Text>
              <Text style={styles.emptySubtitle}>
                Aproveite o tempo livre ou planeje uma nova rotina.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setHabitToEdit(null);
                  setModalVisible(true);
                }}
                style={styles.emptyActionBtn}
                activeOpacity={0.8}>
                <Ionicons name="add-circle" size={18} color={MomentusColors.emeraldNeon} />
                <Text style={styles.emptyActionText}>Criar para esta data</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {habitsForDate.map((habit, index) => {
                const category = categories.find((c) => c.id === habit.categoryId) || {
                  id: 'default',
                  name: 'Geral',
                  color: '#34D399',
                };

                return (
                  <TimelineEventItem
                    key={habit.id}
                    item={habit}
                    category={category}
                    isChecked={habit.completed}
                    isFirst={index === 0}
                    isLast={index === habitsForDate.length - 1}
                    onCheckedChange={() => toggleHabit(habit.id)}
                    onClick={() => setSelectedDetailHabit(habit)}
                    onLongClick={() => {}}
                  />
                );
              })}
            </View>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Floating Action Button (+) */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => {
            setHabitToEdit(null);
            setModalVisible(true);
          }}>
          <Ionicons name="add" size={30} color="#000000" />
        </TouchableOpacity>

        {/* Diálogo de Detalhes */}
        <EventDetailDialog
          visible={!!selectedDetailHabit}
          event={selectedDetailHabit}
          category={
            selectedDetailHabit
              ? categories.find((c) => c.id === selectedDetailHabit.categoryId)
              : undefined
          }
          onDismiss={() => setSelectedDetailHabit(null)}
          onEditClick={() => {
            const h = selectedDetailHabit;
            setSelectedDetailHabit(null);
            setHabitToEdit(h);
            setModalVisible(true);
          }}
          onDeleteClick={() => {
            if (selectedDetailHabit) {
              handleDeleteSingle(selectedDetailHabit);
            }
          }}
        />

        {/* Diálogo de Nova / Editar Rotina */}
        <NewHabitModal
          visible={modalVisible}
          habitToEdit={habitToEdit}
          initialDate={selectedDate}
          onClose={() => {
            setModalVisible(false);
            setHabitToEdit(null);
          }}
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
    paddingTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  toggleViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  toggleViewText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 12,
    fontWeight: '700',
  },
  monthCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  weekdayHeaderText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(52, 211, 153, 0.7)',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayGridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    position: 'relative',
  },
  dayGridCellSelected: {
    backgroundColor: MomentusColors.emeraldNeon,
  },
  dayGridCellToday: {
    borderWidth: 1,
    borderColor: MomentusColors.emeraldNeon,
  },
  dayGridText: {
    fontSize: 13,
    color: MomentusColors.textPrimary,
    fontWeight: '500',
  },
  dayGridTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  dayGridTextToday: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '700',
  },
  hasEventsDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MomentusColors.emeraldNeon,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 4,
  },
  addBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  habitsScroll: {
    flex: 1,
  },
  habitsContent: {
    paddingHorizontal: 20,
  },
  emptyView: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyActionText: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '700',
    fontSize: 13,
  },
  timelineList: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingVertical: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
