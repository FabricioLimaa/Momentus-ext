import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  getContrastTextColor,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { TimelineEventItem } from '@/components/momentus/TimelineEventItem';
import { EventDetailDialog } from '@/components/momentus/EventDetailDialog';
import { NewHabitModal } from '@/components/momentus/NewHabitModal';
import { getTodayDateString } from '@/constants/initialData';
import { HabitItem } from '@/types';

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const WEEKDAYS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];
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

function formatHumanCalendarDate(dateStr: string, isToday: boolean) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  const dayOfWeek = WEEKDAYS_FULL[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  if (isToday) {
    return `Hoje, ${d} de ${monthName}`;
  }
  return `${dayOfWeek}, ${d} de ${monthName}`;
}

interface EventPinsProps {
  pins: string[];
  hasMore: boolean;
  isSelected: boolean;
  primaryColor: string;
}

function EventPins({ pins, hasMore, isSelected, primaryColor }: EventPinsProps) {
  if (pins.length === 0) return null;
  const pinContrastColor = isSelected ? getContrastTextColor(primaryColor) : undefined;
  return (
    <View style={styles.pinsRow}>
      {pins.map((color, idx) => (
        <View
          key={idx}
          style={[
            styles.pinDot,
            { backgroundColor: isSelected ? pinContrastColor : color },
          ]}
        />
      ))}
      {hasMore && (
        <Text
          style={[
            styles.pinPlusText,
            { color: isSelected ? pinContrastColor : primaryColor },
          ]}>
          +
        </Text>
      )}
    </View>
  );
}

export default function CalendarScreen() {
  const {
    habits,
    categories,
    selectedDate,
    setSelectedDate,
    toggleHabit,
    deleteHabit,
    theme,
    settings,
    syncGoogleCalendarToHabitsAction,
  } = useMomentus();

  const primaryColor = settings.primaryColorHex || theme.primary;
  const todayStr = getTodayDateString();

  const [isMonthView, setIsMonthView] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] = useState<HabitItem | null>(null);

  // Sincroniza silenciosamente os eventos da Google Agenda em background e os mescla na lista
  useEffect(() => {
    syncGoogleCalendarToHabitsAction(selectedDate).catch(() => {});
  }, [selectedDate, syncGoogleCalendarToHabitsAction]);

  // Mês/Ano para a visualização mensal
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Data âncora para a visualização semanal (Domingo a Sábado)
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => {
    const [y, m, d] = selectedDate ? selectedDate.split('-').map(Number) : [];
    return y && m && d ? new Date(y, m - 1, d) : new Date();
  });

  // Mapa de categorias por ID para obter cores em O(1)
  const categoriesMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => {
      map.set(c.id, c.color);
    });
    return map;
  }, [categories]);

  // Função para obter até 3 pins de categoria e indicar se há mais
  const getDayPinsInfo = (dateStr: string) => {
    const dayHabits = habits
      .filter((h) => h.date === dateStr)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    const pins = dayHabits
      .slice(0, 3)
      .map((h) => categoriesMap.get(h.categoryId) || primaryColor);
    const hasMore = dayHabits.length > 3;
    return { pins, hasMore };
  };

  // Rotinas do dia selecionado ordenadas por horário de início
  const habitsForDate = useMemo(() => {
    return habits
      .filter((h) => h.date === selectedDate)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [habits, selectedDate]);

  const completedCount = habitsForDate.filter((h) => h.completed).length;

  // Cálculo da Semana (estritamente de Domingo a Sábado)
  const currentWeekDays = useMemo(() => {
    const anchor = new Date(weekAnchorDate);
    const dayOfWeek = anchor.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const dayName = WEEKDAYS[i];
      days.push({
        dateStr,
        dayName,
        dayNumber: d.getDate(),
        fullDate: d,
      });
    }
    return days;
  }, [weekAnchorDate]);

  // Título amigável da semana com o intervalo de dias e mês (ex: "18 a 24 de Outubro 2026")
  const weekTitle = useMemo(() => {
    if (currentWeekDays.length === 0) return '';
    const first = currentWeekDays[0];
    const last = currentWeekDays[6];
    const firstMonth = first.fullDate.getMonth();
    const lastMonth = last.fullDate.getMonth();
    const firstYear = first.fullDate.getFullYear();
    const lastYear = last.fullDate.getFullYear();

    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `${first.dayNumber} a ${last.dayNumber} de ${MONTH_NAMES[firstMonth]} ${firstYear}`;
    }
    if (firstYear === lastYear) {
      return `${first.dayNumber} ${MONTH_NAMES[firstMonth].slice(0, 3)} - ${last.dayNumber} ${MONTH_NAMES[lastMonth].slice(0, 3)} ${firstYear}`;
    }
    return `${first.dayNumber} ${MONTH_NAMES[firstMonth].slice(0, 3)} - ${last.dayNumber} ${MONTH_NAMES[lastMonth].slice(0, 3)} ${lastYear}`;
  }, [currentWeekDays]);

  // Navega para a semana anterior mantendo a seleção coerente e sem travas
  const prevWeek = () => {
    setWeekAnchorDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, '0');
      const d = String(next.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
      setCurrentYearMonth({ year: next.getFullYear(), month: next.getMonth() });
      return next;
    });
  };

  // Navega para a próxima semana mantendo a seleção coerente e sem travas
  const nextWeek = () => {
    setWeekAnchorDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, '0');
      const d = String(next.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
      setCurrentYearMonth({ year: next.getFullYear(), month: next.getMonth() });
      return next;
    });
  };

  const goToToday = () => {
    const now = new Date();
    setWeekAnchorDate(now);
    setCurrentYearMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(todayStr);
  };

  // Cálculo do Grid Mensal (com células compactas e sem aspectRatio excessivo)
  const { year, month } = currentYearMonth;
  const firstDayOfWeekMonth = new Date(year, month, 1).getDay(); // 0 = Domingo
  const totalDaysMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfWeekMonth; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDaysMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }
    return days;
  }, [year, month, firstDayOfWeekMonth, totalDaysMonth]);

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

  // Termo de busca normalizado (sem acentos e minúsculas) para busca instantânea em memória
  const normalizedSearchTerm = useMemo(() => {
    return searchQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }, [searchQuery]);

  // Hábitos que correspondem ao termo de busca (no título, observação ou nome da categoria)
  const matchingHabits = useMemo(() => {
    if (!normalizedSearchTerm) return [];
    return habits.filter((h) => {
      const titleNorm = (h.title || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const descNorm = (h.description || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cat = categories.find((c) => c.id === h.categoryId);
      const catNorm = (cat?.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return (
        titleNorm.includes(normalizedSearchTerm) ||
        descNorm.includes(normalizedSearchTerm) ||
        catNorm.includes(normalizedSearchTerm)
      );
    });
  }, [habits, categories, normalizedSearchTerm]);

  // Conjunto de datas com ocorrências do termo pesquisado
  const matchingDatesSet = useMemo(() => {
    return new Set(matchingHabits.map((h) => h.date));
  }, [matchingHabits]);

  // Contagem de dias com ocorrências no mês atualmente visualizado
  const monthMatchingDaysCount = useMemo(() => {
    if (!normalizedSearchTerm) return 0;
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let count = 0;
    matchingDatesSet.forEach((dateStr) => {
      if (dateStr.startsWith(monthPrefix)) {
        count++;
      }
    });
    return count;
  }, [normalizedSearchTerm, matchingDatesSet, year, month]);

  // Contagem de dias com ocorrências na semana atualmente visualizada
  const weekMatchingDaysCount = useMemo(() => {
    if (!normalizedSearchTerm) return 0;
    return currentWeekDays.filter((d) => matchingDatesSet.has(d.dateStr)).length;
  }, [normalizedSearchTerm, currentWeekDays, matchingDatesSet]);

  // Rotinas filtradas para a timeline do dia selecionado
  const displayHabits = useMemo(() => {
    if (!normalizedSearchTerm) return habitsForDate;
    return habitsForDate.filter((h) => {
      const titleNorm = (h.title || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const descNorm = (h.description || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cat = categories.find((c) => c.id === h.categoryId);
      const catNorm = (cat?.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return (
        titleNorm.includes(normalizedSearchTerm) ||
        descNorm.includes(normalizedSearchTerm) ||
        catNorm.includes(normalizedSearchTerm)
      );
    });
  }, [habitsForDate, normalizedSearchTerm, categories]);

  const isCurrentWeekShowingToday = currentWeekDays.some((d) => d.dateStr === todayStr);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header Principal */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Agenda & Rotinas</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Sincronizado com seus blocos e metas
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.searchToggleBtn,
                {
                  backgroundColor: isSearchOpen ? `${primaryColor}20` : theme.surface,
                  borderColor: isSearchOpen ? primaryColor : theme.outline,
                },
              ]}
              onPress={() => {
                const nextState = !isSearchOpen;
                setIsSearchOpen(nextState);
                if (!nextState) {
                  setSearchQuery('');
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={isSearchOpen ? 'Fechar busca' : 'Buscar rotinas'}
              activeOpacity={0.7}>
              <Ionicons
                name={isSearchOpen ? 'close' : 'search'}
                size={18}
                color={isSearchOpen ? primaryColor : theme.textPrimary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleViewBtn,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}
              onPress={() => setIsMonthView(!isMonthView)}
              accessibilityRole="button"
              accessibilityLabel={`Mudar visualização para ${isMonthView ? 'Semana' : 'Mês'}`}
              activeOpacity={0.7}>
              <Ionicons
                name={isMonthView ? 'calendar-outline' : 'grid-outline'}
                size={16}
                color={primaryColor}
              />
              <Text style={[styles.toggleViewText, { color: primaryColor }]}>
                {isMonthView ? 'Semana' : 'Mês'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Busca Retrátil */}
        {isSearchOpen && (
          <View style={styles.searchBarWrapper}>
            <View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: searchQuery.trim() ? primaryColor : theme.outline,
                },
              ]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por rotina, nota ou categoria..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.textPrimary }]}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca">
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Contador de Ocorrências e Feedback Contextual */}
            {normalizedSearchTerm.length > 0 && (
              <View style={styles.searchFeedbackRow}>
                <View
                  style={[
                    styles.searchBadge,
                    {
                      backgroundColor: `${primaryColor}15`,
                      borderColor: `${primaryColor}35`,
                    },
                  ]}>
                  <Ionicons name="calendar-outline" size={12} color={primaryColor} />
                  <Text style={[styles.searchBadgeText, { color: primaryColor }]}>
                    {isMonthView
                      ? monthMatchingDaysCount === 0
                        ? 'Nenhuma ocorrência neste mês'
                        : `Encontrado em ${monthMatchingDaysCount} ${
                            monthMatchingDaysCount === 1 ? 'dia' : 'dias'
                          } neste mês`
                      : weekMatchingDaysCount === 0
                      ? 'Nenhuma ocorrência nesta semana'
                      : `Encontrado em ${weekMatchingDaysCount} ${
                          weekMatchingDaysCount === 1 ? 'dia' : 'dias'
                        } nesta semana`}
                  </Text>
                </View>

                {matchingHabits.length > 0 && (
                  <Text style={[styles.searchTotalText, { color: theme.textSecondary }]}>
                    {matchingHabits.length} {matchingHabits.length === 1 ? 'ocorrência' : 'ocorrências no total'}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Visualização de Mês ou Semana */}
        {isMonthView ? (
          <View
            style={[
              styles.monthCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            {/* Barra de Navegação do Mês */}
            <View style={styles.calendarNavRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.navTitle, { color: theme.textPrimary }]}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <View style={styles.navRightGroup}>
                <TouchableOpacity
                  onPress={goToToday}
                  style={[styles.todayBadgeBtn, { borderColor: theme.outline }]}
                  activeOpacity={0.7}>
                  <Text style={[styles.todayBadgeText, { color: primaryColor }]}>Hoje</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cabeçalho dos Dias da Semana (DOM a SÁB) */}
            <View style={styles.weekdaysHeader}>
              {WEEKDAYS.map((w, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.weekdayHeaderText,
                    { color: idx === 0 || idx === 6 ? primaryColor : theme.textSecondary },
                  ]}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Grid dos Dias do Mês */}
            <View style={styles.daysGrid}>
              {calendarDays.map((item, index) => {
                if (!item) {
                  return <View key={`blank-${index}`} style={styles.dayGridCellBlank} />;
                }
                const isSelected = selectedDate === item.dateStr;
                const isToday = todayStr === item.dateStr;
                const hasMatch = matchingDatesSet.has(item.dateStr);
                const isSearchActive = Boolean(normalizedSearchTerm);
                const { pins, hasMore } = getDayPinsInfo(item.dateStr);
                const contrastSelected = getContrastTextColor(primaryColor);

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    onPress={() => setSelectedDate(item.dateStr)}
                    style={[
                      styles.dayGridCell,
                      isSelected && { backgroundColor: primaryColor },
                      isToday && !isSelected && { borderColor: primaryColor, borderWidth: 1.5 },
                      isSearchActive && hasMatch && !isSelected && {
                        backgroundColor: `${primaryColor}20`,
                        borderColor: primaryColor,
                        borderWidth: 1.5,
                      },
                      isSearchActive && !hasMatch && !isSelected && {
                        opacity: 0.3,
                      },
                    ]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.dayGridText,
                        { color: isSelected ? contrastSelected : theme.textPrimary },
                        isSelected && { fontWeight: '800' },
                        isToday && !isSelected && { color: primaryColor, fontWeight: '700' },
                        isSearchActive && hasMatch && !isSelected && {
                          color: primaryColor,
                          fontWeight: '800',
                        },
                      ]}>
                      {item.dayNumber}
                    </Text>

                    {/* Pins de Categoria e Sinalizador + */}
                    <EventPins
                      pins={pins}
                      hasMore={hasMore}
                      isSelected={isSelected}
                      primaryColor={primaryColor}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.weekCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            {/* Barra de Navegação da Semana */}
            <View style={styles.calendarNavRow}>
              <TouchableOpacity
                onPress={prevWeek}
                style={styles.navBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text
                style={[styles.navTitle, { color: theme.textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {weekTitle}
              </Text>
              <View style={styles.navRightGroup}>
                {!isCurrentWeekShowingToday && (
                  <TouchableOpacity
                    onPress={goToToday}
                    style={[styles.todayBadgeBtn, { borderColor: theme.outline }]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.todayBadgeText, { color: primaryColor }]}>Hoje</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={nextWeek}
                  style={styles.navBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="chevron-forward" size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Os 7 Dias da Semana (DOM até SÁB) */}
            <View style={styles.weekDaysRow}>
              {currentWeekDays.map((item) => {
                const isSelected = selectedDate === item.dateStr;
                const isToday = todayStr === item.dateStr;
                const hasMatch = matchingDatesSet.has(item.dateStr);
                const isSearchActive = Boolean(normalizedSearchTerm);
                const { pins, hasMore } = getDayPinsInfo(item.dateStr);
                const contrastSelected = getContrastTextColor(primaryColor);

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    onPress={() => setSelectedDate(item.dateStr)}
                    style={[
                      styles.weekDayBox,
                      { borderColor: theme.outline },
                      isSelected && {
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                      },
                      isToday && !isSelected && {
                        borderColor: primaryColor,
                        borderWidth: 1.5,
                      },
                      isSearchActive && hasMatch && !isSelected && {
                        backgroundColor: `${primaryColor}20`,
                        borderColor: primaryColor,
                        borderWidth: 1.5,
                      },
                      isSearchActive && !hasMatch && !isSelected && {
                        opacity: 0.3,
                      },
                    ]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.weekDayName,
                        { color: theme.textSecondary },
                        isSelected && { color: contrastSelected, fontWeight: '800' },
                        isToday && !isSelected && { color: primaryColor, fontWeight: '700' },
                        isSearchActive && hasMatch && !isSelected && {
                          color: primaryColor,
                          fontWeight: '800',
                        },
                      ]}>
                      {item.dayName}
                    </Text>
                    <Text
                      style={[
                        styles.weekDayNumber,
                        { color: theme.textPrimary },
                        isSelected && { color: contrastSelected, fontWeight: '900' },
                        isToday && !isSelected && { color: primaryColor, fontWeight: '700' },
                        isSearchActive && hasMatch && !isSelected && {
                          color: primaryColor,
                          fontWeight: '900',
                        },
                      ]}>
                      {item.dayNumber}
                    </Text>

                    {/* Pins de Categoria e Sinalizador + */}
                    <EventPins
                      pins={pins}
                      hasMore={hasMore}
                      isSelected={isSelected}
                      primaryColor={primaryColor}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Resumo Humanizado do Dia Selecionado com Barra de Progresso */}
        {(() => {
          const isSearchActive = Boolean(normalizedSearchTerm);
          const activeList = isSearchActive ? displayHabits : habitsForDate;
          const displayCompleted = activeList.filter((h) => h.completed).length;
          const progressPercent =
            activeList.length > 0 ? Math.round((displayCompleted / activeList.length) * 100) : 0;
          const allCompleted = activeList.length > 0 && displayCompleted === activeList.length;

          return (
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryLeft}>
                  <View style={[styles.summaryIconBox, { backgroundColor: `${primaryColor}20` }]}>
                    <Ionicons name={isSearchActive ? 'search' : 'calendar'} size={18} color={primaryColor} />
                  </View>
                  <View style={styles.summaryTextGroup}>
                    <Text style={[styles.summaryDateText, { color: theme.textPrimary }]}>
                      {formatHumanCalendarDate(selectedDate, selectedDate === todayStr)}
                    </Text>
                    <Text style={[styles.summaryHabitsCount, { color: theme.textSecondary }]}>
                      {isSearchActive
                        ? activeList.length === 0
                          ? 'Nenhuma rotina com o termo nesta data'
                          : `${activeList.length} ${
                              activeList.length === 1 ? 'rotina encontrada' : 'rotinas encontradas'
                            } (${displayCompleted} concluída${displayCompleted === 1 ? '' : 's'})`
                        : habitsForDate.length === 0
                        ? 'Nenhuma atividade agendada'
                        : `${completedCount} de ${habitsForDate.length} concluídas`}
                    </Text>
                  </View>
                </View>

                {activeList.length > 0 && (
                  <View
                    style={[
                      styles.progressBadge,
                      {
                        backgroundColor: allCompleted
                          ? `${MomentusColors.emeraldGreen}20`
                          : `${primaryColor}15`,
                        borderColor: allCompleted
                          ? MomentusColors.emeraldGreen
                          : `${primaryColor}40`,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.progressBadgeText,
                        {
                          color: allCompleted ? MomentusColors.emeraldGreen : primaryColor,
                        },
                      ]}>
                      {allCompleted ? '100% Concluído 🎉' : `${progressPercent}%`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Barra de Progresso do Dia */}
              {activeList.length > 0 && (
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: allCompleted ? MomentusColors.emeraldGreen : primaryColor,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          );
        })()}

        {/* Timeline Vertical das Rotinas do Dia */}
        <ScrollView
          style={styles.habitsScroll}
          contentContainerStyle={styles.habitsContent}
          showsVerticalScrollIndicator={false}>
          {displayHabits.length === 0 ? (
            <View style={styles.emptyView}>
              <Ionicons
                name={normalizedSearchTerm ? 'search-outline' : 'sparkles-outline'}
                size={42}
                color={MomentusColors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {normalizedSearchTerm ? 'Nenhuma rotina encontrada' : 'Nenhum evento neste dia'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {normalizedSearchTerm
                  ? `Não há rotinas com "${searchQuery}" em ${formatHumanCalendarDate(
                      selectedDate,
                      selectedDate === todayStr
                    )}.`
                  : 'Aproveite o tempo livre ou planeje uma nova rotina.'}
              </Text>
              {normalizedSearchTerm ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={[styles.emptyActionBtn, { borderColor: primaryColor }]}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                  activeOpacity={0.8}>
                  <Ionicons name="refresh" size={18} color={primaryColor} />
                  <Text style={[styles.emptyActionText, { color: primaryColor }]}>
                    Limpar filtro de busca
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setHabitToEdit(null);
                    setModalVisible(true);
                  }}
                  style={[styles.emptyActionBtn, { borderColor: primaryColor }]}
                  activeOpacity={0.8}>
                  <Ionicons name="add-circle" size={18} color={primaryColor} />
                  <Text style={[styles.emptyActionText, { color: primaryColor }]}>
                    Criar para esta data
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.timelineList,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.outline,
                },
              ]}>
              {displayHabits.map((habit, index) => {
                const category = categories.find((c) => c.id === habit.categoryId) || {
                  id: 'cat-outros',
                  name: 'Outros',
                  color: primaryColor,
                };

                return (
                  <TimelineEventItem
                    key={habit.id}
                    item={habit}
                    category={category}
                    isChecked={habit.completed}
                    isFirst={index === 0}
                    isLast={index === displayHabits.length - 1}
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
          style={[styles.fab, { backgroundColor: primaryColor }]}
          activeOpacity={0.85}
          onPress={() => {
            setHabitToEdit(null);
            setModalVisible(true);
          }}>
          <Ionicons name="add" size={30} color={getContrastTextColor(primaryColor)} />
        </TouchableOpacity>

        {/* Diálogo de Detalhes da Rotina */}
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

        {/* Modal para Criar / Editar Rotina */}
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
    width: '100%',
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  searchToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  toggleViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  toggleViewText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarWrapper: {
    marginHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadiusTokens.input,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: ComponentHeightTokens.input || 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  searchFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  searchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadiusTokens.xs,
    borderWidth: 1,
  },
  searchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchTotalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  monthCard: {
    marginHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: 14,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 12,
  },
  weekCard: {
    marginHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: 14,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 12,
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  todayBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 4,
  },
  weekdayHeaderText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayGridCellBlank: {
    width: `${100 / 7}%`,
    height: 44,
  },
  dayGridCell: {
    width: `${100 / 7}%`,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 2,
  },
  dayGridText: {
    fontSize: 13,
    fontWeight: '500',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekDayBox: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  weekDayNumber: {
    fontSize: 17,
    fontWeight: '800',
  },
  pinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 3,
    height: 7,
  },
  pinDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pinPlusText: {
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 1,
    lineHeight: 9,
  },
  summaryCard: {
    marginHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: 14,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextGroup: {
    flex: 1,
  },
  summaryDateText: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryHabitsCount: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  habitsScroll: {
    flex: 1,
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
  },
  habitsContent: {
    paddingBottom: LayoutTokens.pagePaddingBottom,
    width: '100%',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: BorderRadiusTokens.card,
  },
  emptyTitle: {
    ...TypographyTokens.cardTitle,
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TypographyTokens.screenSubtitle,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadiusTokens.control,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timelineList: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: LayoutTokens.pagePaddingHorizontal,
    width: ComponentHeightTokens.fab,
    height: ComponentHeightTokens.fab,
    borderRadius: ComponentHeightTokens.fab / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
});
