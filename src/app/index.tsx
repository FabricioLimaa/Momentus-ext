import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { GlassCard } from '@/components/momentus/GlassCard';
import { TimelineEventItem } from '@/components/momentus/TimelineEventItem';
import { EventDetailDialog } from '@/components/momentus/EventDetailDialog';
import { NewHabitModal } from '@/components/momentus/NewHabitModal';
import { getTodayDateString, getStreakColor } from '@/constants/initialData';
import { HabitItem } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const {
    habits,
    categories,
    userProfile,
    theme,
    toggleHabit,
    deleteHabit,
    deleteMultipleHabits,
  } = useMomentus();

  // Estados de modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] = useState<HabitItem | null>(null);

  // Estados de seleção múltipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);

  const todayStr = getTodayDateString();
  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => h.date === todayStr)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [habits, todayStr]);

  const totalToday = todayHabits.length;
  const completionsToday = todayHabits.filter((h) => h.completed).length;
  const progress = totalToday > 0 ? completionsToday / totalToday : 0;

  // Frase motivacional idêntica ao Jetpack Compose HomeScreen.kt
  const motivationalText = useMemo(() => {
    if (totalToday === 0) return 'Dia livre! Que tal planejar algo novo? ✨';
    if (completionsToday === 0) return 'Vamos começar? O primeiro passo! 🚀';
    if (progress < 0.5) return 'Ótimo começo! Continue focado. 💪';
    if (progress < 1.0) return 'Mais da metade concluído! Você está quase lá. ⚡';
    return 'Dia perfeito! Você conquistou todas as suas metas! 🏆';
  }, [totalToday, completionsToday, progress]);

  // Saudação por horário
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia,';
    if (hour < 18) return 'Boa tarde,';
    return 'Boa noite,';
  }, []);

  const userName = userProfile.name ? userProfile.name.split(' ')[0] : 'Explorador';

  // Toggle seleção múltipla
  const handleToggleSelectHabit = (id: string) => {
    setSelectedHabitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedHabitIds.length === todayHabits.length) {
      setSelectedHabitIds([]);
    } else {
      setSelectedHabitIds(todayHabits.map((h) => h.id));
    }
  };

  const handleClearSelection = () => {
    setIsSelectionMode(false);
    setSelectedHabitIds([]);
  };

  const handleConfirmDeleteSelected = () => {
    if (selectedHabitIds.length === 0) return;
    Alert.alert(
      'Excluir Selecionadas',
      `Tem certeza que deseja excluir as ${selectedHabitIds.length} rotinas selecionadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Todas',
          style: 'destructive',
          onPress: () => {
            deleteMultipleHabits(selectedHabitIds);
            handleClearSelection();
          },
        },
      ]
    );
  };

  const handleConfirmDeleteSingle = (habit: HabitItem) => {
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
        {/* TopBar no modo de seleção múltipla */}
        {isSelectionMode ? (
          <View
            style={[
              styles.selectionTopBar,
              { backgroundColor: theme.surface, borderBottomColor: theme.outline },
            ]}>
            <TouchableOpacity onPress={handleClearSelection} style={styles.iconButton}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.selectionCountText, { color: theme.textPrimary }]}>
              {selectedHabitIds.length} selecionada{selectedHabitIds.length === 1 ? '' : 's'}
            </Text>

            <View style={styles.selectionActions}>
              <TouchableOpacity onPress={handleSelectAll} style={styles.iconButton}>
                <Ionicons
                  name={
                    selectedHabitIds.length === todayHabits.length && todayHabits.length > 0
                      ? 'checkbox'
                      : 'checkbox-outline'
                  }
                  size={22}
                  color={theme.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmDeleteSelected}
                disabled={selectedHabitIds.length === 0}
                style={[
                  styles.iconButton,
                  selectedHabitIds.length === 0 && { opacity: 0.4 },
                ]}>
                <Ionicons name="trash-outline" size={22} color={MomentusColors.errorRed} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* 1. Header de Saudação (Mockup 3) */}
          <View style={styles.homeHeader}>
            <TouchableOpacity
              onPress={() => router.push('/more' as any)}
              style={styles.userProfileGreetingRow}
              activeOpacity={0.8}>
              <View style={[styles.homeAvatar, { borderColor: theme.primary }]}>
                {userProfile.photoUrl ? (
                  <Image
                    source={{ uri: userProfile.photoUrl }}
                    style={styles.homeAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={[styles.homeAvatarText, { color: theme.primary }]}>
                    {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                )}
              </View>
              <View>
                <Text style={[styles.greetingText, { color: theme.textSecondary }]}>{greeting}</Text>
                <Text style={[styles.userNameText, { color: theme.textPrimary }]}>{userName} 👋</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/updates' as any)}
              style={[
                styles.notificationButton,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}
              activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* 2. Card de Streak & Progresso Circular (Mockup 3) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/achievements' as any)}
            style={styles.streakCardContainer}>
            <GlassCard
              style={[
                styles.streakGlassCard,
                { backgroundColor: theme.glassCard, borderColor: theme.glassBorder },
              ]}>
              <View style={styles.streakCardRow}>
                <View style={styles.streakInfoCol}>
                  <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
                    Sequência Atual
                  </Text>
                  <View style={styles.streakNumberRow}>
                    <Ionicons
                      name="flame"
                      size={28}
                      color={getStreakColor(userProfile.currentStreak)}
                    />
                    <Text style={[styles.streakNumberText, { color: theme.textPrimary }]}>
                      {userProfile.currentStreak} dias
                    </Text>
                  </View>
                  <Text style={[styles.motivationalText, { color: theme.textSecondary }]}>
                    {motivationalText}
                  </Text>
                </View>

                {/* Progresso circular estilizado */}
                <View style={styles.circularProgressContainer}>
                  <View style={[styles.circularProgressRing, { borderColor: theme.primary }]}>
                    <Text style={[styles.progressPercentageText, { color: theme.primary }]}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* 3. Seção "Seu dia" com Timeline Vertical */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Seu dia</Text>
            <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
              {completionsToday}/{totalToday} concluídas
            </Text>
          </View>

          {todayHabits.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                Nada agendado para hoje
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Toque no + para começar sua jornada.
              </Text>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {todayHabits.map((habit, index) => {
                const category = categories.find((c) => c.id === habit.categoryId) || {
                  id: 'default',
                  name: 'Geral',
                  color: '#34D399',
                };

                const isSelected = selectedHabitIds.includes(habit.id);

                return (
                  <TimelineEventItem
                    key={habit.id}
                    item={habit}
                    category={category}
                    isChecked={habit.completed}
                    isFirst={index === 0}
                    isLast={index === todayHabits.length - 1}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode}
                    onCheckedChange={() => toggleHabit(habit.id)}
                    onClick={() => {
                      if (isSelectionMode) {
                        handleToggleSelectHabit(habit.id);
                      } else {
                        setSelectedDetailHabit(habit);
                      }
                    }}
                    onLongClick={() => {
                      if (!isSelectionMode) {
                        setIsSelectionMode(true);
                        setSelectedHabitIds([habit.id]);
                      }
                    }}
                  />
                );
              })}
            </View>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Floating Action Button (+) */}
        {!isSelectionMode && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={() => {
              setHabitToEdit(null);
              setIsAddModalVisible(true);
            }}>
            <Ionicons name="add" size={30} color="#000000" />
          </TouchableOpacity>
        )}

        {/* Modal de Detalhes do Evento */}
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
            setIsAddModalVisible(true);
          }}
          onDeleteClick={() => {
            if (selectedDetailHabit) {
              handleConfirmDeleteSingle(selectedDetailHabit);
            }
          }}
        />

        {/* Modal de Criação / Edição de Rotina */}
        <NewHabitModal
          visible={isAddModalVisible}
          habitToEdit={habitToEdit}
          initialDate={todayStr}
          onClose={() => {
            setIsAddModalVisible(false);
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
  selectionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MomentusColors.navySurface,
    borderBottomWidth: 1,
    borderBottomColor: MomentusColors.navyOutline,
  },
  selectionCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userProfileGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  homeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  homeAvatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  greetingText: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCardContainer: {
    marginBottom: 32,
  },
  streakGlassCard: {
    padding: 20,
  },
  streakCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfoCol: {
    flex: 1,
    paddingRight: 12,
  },
  streakLabel: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    fontWeight: '600',
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  streakNumberText: {
    fontSize: 22,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
  },
  motivationalText: {
    fontSize: 13,
    fontWeight: '700',
    color: MomentusColors.emeraldNeon,
    marginTop: 2,
    lineHeight: 18,
  },
  circularProgressContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 6,
    borderColor: MomentusColors.emeraldNeon,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentageText: {
    fontSize: 16,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: MomentusColors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    marginTop: 4,
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
    backgroundColor: MomentusColors.emeraldNeon,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
