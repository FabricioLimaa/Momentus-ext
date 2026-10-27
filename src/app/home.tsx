import { CircularProgressRing } from "@/components/momentus/CircularProgressRing";
import { EventDetailDialog } from "@/components/momentus/EventDetailDialog";
import { GlassCard } from "@/components/momentus/GlassCard";
import { NewHabitModal } from "@/components/momentus/NewHabitModal";
import { TimelineEventItem } from "@/components/momentus/TimelineEventItem";
import { SplashScreen } from "@/components/momentus/SplashScreen";
import { auth as firebaseAuth } from "@/config/firebase";
import {
  getStreakColor,
  getTodayDateString,
  formatFullDateDisplay,
  getWeekDaysStrip,
} from "@/constants/initialData";
import {
  MomentusColors,
  getContrastTextColor,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
} from "@/constants/theme";
import { useMomentus } from "@/context/MomentusContext";
import { HabitItem } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const {
    habits,
    categories,
    userProfile,
    theme,
    isLoaded,
    toggleHabit,
    deleteHabit,
    deleteMultipleHabits,
  } = useMomentus();

  // Estados de modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] =
    useState<HabitItem | null>(null);

  // Estados de seleção múltipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [avatarError, setAvatarError] = useState(false);

  // Estados de data e filtros da Home
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  const authUser = firebaseAuth.currentUser;
  const resolvedName =
    userProfile.name && userProfile.name !== "Usuário"
      ? userProfile.name
      : authUser?.displayName?.trim() || userProfile.name || "Explorador";
  const userName = resolvedName.split(" ")[0] || "Explorador";
  const displayPhoto = userProfile.photoUrl || authUser?.photoURL || null;

  // Mapa de hábitos por data para os indicadores visuais na fita de dias
  const habitsByDateMap = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    habits.forEach((h) => {
      if (!h.date) return;
      const cur = map.get(h.date) || { total: 0, completed: 0 };
      cur.total += 1;
      if (h.completed) cur.completed += 1;
      map.set(h.date, cur);
    });
    return map;
  }, [habits]);

  // Fita de 7 dias centrada na data selecionada ou em hoje
  const weekDaysStrip = useMemo(() => {
    return getWeekDaysStrip(todayStr, todayStr, habitsByDateMap);
  }, [todayStr, habitsByDateMap]);

  // Hábitos do dia atualmente selecionado na Home
  const dateHabits = useMemo(() => {
    return habits
      .filter((h) => h.date === selectedDateStr)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [habits, selectedDateStr]);

  const isViewingToday = selectedDateStr === todayStr;
  const totalInDate = dateHabits.length;
  const completionsInDate = dateHabits.filter((h) => h.completed).length;
  const pendingInDate = totalInDate - completionsInDate;
  const progress = totalInDate > 0 ? completionsInDate / totalInDate : 0;

  // Lista de hábitos filtrados pelo status (Todas, Pendentes ou Concluídas)
  const filteredHabits = useMemo(() => {
    if (filterStatus === "PENDING") {
      return dateHabits.filter((h) => !h.completed);
    }
    if (filterStatus === "COMPLETED") {
      return dateHabits.filter((h) => h.completed);
    }
    return dateHabits;
  }, [dateHabits, filterStatus]);

  // Nível de XP dinâmico do usuário
  const userLevel = Math.floor((userProfile.totalPoints || 0) / 100) + 1;
  const fullDateFormatted = useMemo(() => formatFullDateDisplay(selectedDateStr), [selectedDateStr]);

  // Frase motivacional contextualizada
  const motivationalText = useMemo(() => {
    if (totalInDate === 0) return "Dia livre! Que tal planejar algo novo? ✨";
    if (completionsInDate === 0) return "Vamos começar? O primeiro passo! 🚀";
    if (progress < 0.5) return "Ótimo começo! Continue focado. 💪";
    if (progress < 1.0) return "Mais da metade concluído! Você está quase lá. ⚡";
    return "Dia perfeito! Você conquistou todas as suas metas! 🏆";
  }, [totalInDate, completionsInDate, progress]);

  // Saudação por horário
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia,";
    if (hour < 18) return "Boa tarde,";
    return "Boa noite,";
  }, []);

  // Toggle seleção múltipla
  const handleToggleSelectHabit = (id: string) => {
    setSelectedHabitIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      if (next.length === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedHabitIds.length === dateHabits.length) {
      setSelectedHabitIds([]);
    } else {
      setSelectedHabitIds(dateHabits.map((h) => h.id));
    }
  };

  const handleClearSelection = () => {
    setIsSelectionMode(false);
    setSelectedHabitIds([]);
  };

  const handleConfirmDeleteSelected = () => {
    if (selectedHabitIds.length === 0) return;
    Alert.alert(
      "Excluir Selecionadas",
      `Tem certeza que deseja excluir as ${selectedHabitIds.length} rotinas selecionadas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir Todas",
          style: "destructive",
          onPress: () => {
            deleteMultipleHabits(selectedHabitIds);
            handleClearSelection();
          },
        },
      ],
    );
  };

  const handleConfirmDeleteSingle = (habit: HabitItem) => {
    Alert.alert(
      "Excluir Rotina",
      "Deseja realmente remover esta rotina? Esta ação não poderá ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            deleteHabit(habit.id);
            setSelectedDetailHabit(null);
          },
        },
      ],
    );
  };

  if (!isLoaded) {
    return <SplashScreen syncMessage="Preparando seu espaço..." />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* TopBar no modo de seleção múltipla */}
        {isSelectionMode ? (
          <View
            style={[
              styles.selectionTopBar,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.outline,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleClearSelection}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text
              style={[styles.selectionCountText, { color: theme.textPrimary }]}
            >
              {selectedHabitIds.length} selecionada
              {selectedHabitIds.length === 1 ? "" : "s"}
            </Text>

            <View style={styles.selectionActions}>
              <TouchableOpacity
                onPress={handleSelectAll}
                style={styles.iconButton}
              >
                <Ionicons
                  name={
                    selectedHabitIds.length === dateHabits.length &&
                    dateHabits.length > 0
                      ? "checkbox"
                      : "checkbox-outline"
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
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={MomentusColors.errorRed}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header de Saudação & Identidade Visual Oficial da Marca */}
          <View style={styles.homeHeader}>
            <TouchableOpacity
              onPress={() => router.push("/more" as any)}
              style={styles.userProfileGreetingRow}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.homeAvatar,
                  {
                    borderColor: theme.primary,
                    backgroundColor: `${theme.primary}18`,
                  },
                ]}
              >
                {displayPhoto && !avatarError ? (
                  <Image
                    source={{ uri: displayPhoto }}
                    style={styles.homeAvatarImage}
                    resizeMode="cover"
                    onError={() => setAvatarError(true)}
                    {...(Platform.OS === "web"
                      ? { referrerPolicy: "no-referrer" }
                      : {})}
                  />
                ) : (
                  <Text
                    style={[styles.homeAvatarText, { color: theme.primary }]}
                  >
                    {resolvedName ? resolvedName.charAt(0).toUpperCase() : "U"}
                  </Text>
                )}
              </View>
              <View>
                <Text
                  style={[styles.greetingText, { color: theme.textSecondary }]}
                >
                  {greeting}
                </Text>
                <Text
                  style={[styles.userNameText, { color: theme.textPrimary }]}
                >
                  {userName} 👋
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              {/* Badge Oficial da Marca Momentus */}
              <View
                style={[
                  styles.brandSymbolBadge,
                  {
                    backgroundColor: theme.isDark ? "#001A40" : "#FFFFFF",
                    borderColor: `${theme.primary}35`,
                  },
                ]}
              >
                <Image
                  source={require("@/../assets/images/brand/symbol-transparent.png")}
                  style={styles.brandSymbolImg}
                  resizeMode="contain"
                />
              </View>

              {/* Botão de Novidades / Notificações */}
              <TouchableOpacity
                onPress={() => router.push("/updates" as any)}
                style={[
                  styles.notificationButton,
                  { backgroundColor: theme.surface, borderColor: theme.outline },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Subcabeçalho com Data por Extenso e Atalho "Hoje" */}
          <View style={styles.dateSubHeader}>
            <View style={styles.dateInfoRow}>
              <Ionicons name="calendar-outline" size={15} color={theme.primary} />
              <Text style={[styles.dateSubHeaderText, { color: theme.textSecondary }]}>
                {fullDateFormatted}
              </Text>
            </View>

            {!isViewingToday && (
              <TouchableOpacity
                style={[
                  styles.backTodayBtn,
                  { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}50` },
                ]}
                onPress={() => setSelectedDateStr(todayStr)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-undo-outline" size={13} color={theme.primary} />
                <Text style={[styles.backTodayBtnText, { color: theme.primary }]}>
                  Voltar para Hoje
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 2. Mini Fita Horizontal de Dias (Date Strip de 7 Dias) */}
          <View style={styles.dateStripContainer}>
            {weekDaysStrip.map((item) => {
              const isSelected = item.dateStr === selectedDateStr;

              return (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[
                    styles.dateStripItem,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : theme.surface,
                      borderColor: isSelected
                        ? theme.primary
                        : item.isToday
                          ? `${theme.primary}60`
                          : theme.outline,
                    },
                  ]}
                  onPress={() => setSelectedDateStr(item.dateStr)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateStripDayName,
                      {
                        color: isSelected
                          ? "#0F172A"
                          : item.isToday
                            ? theme.primary
                            : theme.textSecondary,
                        fontWeight: isSelected || item.isToday ? "800" : "600",
                      },
                    ]}
                  >
                    {item.weekDayName}
                  </Text>
                  <Text
                    style={[
                      styles.dateStripDayNum,
                      {
                        color: isSelected
                          ? "#0F172A"
                          : theme.textPrimary,
                        fontWeight: isSelected ? "900" : "700",
                      },
                    ]}
                  >
                    {item.dayNum}
                  </Text>

                  {/* Indicador de Rotinas do Dia */}
                  <View style={styles.dateDotContainer}>
                    {item.hasHabits ? (
                      <View
                        style={[
                          styles.dateStripDot,
                          {
                            backgroundColor: isSelected
                              ? "#0F172A"
                              : item.allCompleted
                                ? theme.primary
                                : MomentusColors.cyan,
                          },
                        ]}
                      />
                    ) : (
                      <View style={styles.dateStripDotEmpty} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Card de Streak & Progresso Circular (GlassCard Enriquecido) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/achievements" as any)}
            style={styles.streakCardContainer}
          >
            <GlassCard
              style={[
                styles.streakGlassCard,
                {
                  backgroundColor: theme.glassCard,
                  borderColor: theme.glassBorder,
                },
              ]}
            >
              <View style={styles.streakCardRow}>
                <View style={styles.streakInfoCol}>
                  <Text
                    style={[styles.streakLabel, { color: theme.textSecondary }]}
                  >
                    Sequência Atual
                  </Text>
                  <View style={styles.streakNumberRow}>
                    <Ionicons
                      name="flame"
                      size={28}
                      color={getStreakColor(userProfile.currentStreak)}
                    />
                    <Text
                      style={[
                        styles.streakNumberText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {userProfile.currentStreak} dias
                    </Text>
                  </View>

                  {/* Pílulas de Gamificação (XP e Minutos Focados) */}
                  <View style={styles.gamificationRow}>
                    <View
                      style={[
                        styles.gamificationChip,
                        { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` },
                      ]}
                    >
                      <Ionicons name="trophy-outline" size={12} color={theme.primary} />
                      <Text style={[styles.gamificationChipText, { color: theme.primary }]}>
                        Nv. {userLevel} • {userProfile.totalPoints || 0} XP
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.gamificationChip,
                        { backgroundColor: `${MomentusColors.cyan}15`, borderColor: `${MomentusColors.cyan}40` },
                      ]}
                    >
                      <Ionicons name="timer-outline" size={12} color={MomentusColors.cyan} />
                      <Text style={[styles.gamificationChipText, { color: MomentusColors.cyan }]}>
                        {userProfile.focusMinutesToday || 0}m foco
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.motivationalText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {motivationalText}
                  </Text>
                </View>

                {/* Progresso circular funcional */}
                <View style={styles.circularProgressContainer}>
                  <CircularProgressRing
                    progress={progress}
                    size={78}
                    strokeWidth={8}
                    color={theme.primary}
                  />
                </View>
              </View>

              {/* Banner Comemorativo de 100% Concluído */}
              {progress === 1.0 && totalInDate > 0 && (
                <View
                  style={[
                    styles.perfectDayBanner,
                    { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}60` },
                  ]}
                >
                  <Ionicons name="star" size={16} color={theme.primary} />
                  <Text style={[styles.perfectDayBannerText, { color: theme.primary }]}>
                    Dia Perfeito Conquistado! 100% das metas cumpridas!
                  </Text>
                </View>
              )}
            </GlassCard>
          </TouchableOpacity>

          {/* 4. Seção "Seu dia" com Filtros Rápidos */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {isViewingToday ? "Seu dia" : "Rotinas do dia"}
              </Text>
              <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
                {completionsInDate}/{totalInDate} concluída{totalInDate === 1 ? "" : "s"}
              </Text>
            </View>

            {/* Chips de Filtro Rápido (Todas, Pendentes, Concluídas) */}
            {totalInDate > 0 && (
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterStatus === "ALL"
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}
                  onPress={() => setFilterStatus("ALL")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterStatus === "ALL" ? "#0F172A" : theme.textSecondary },
                    ]}
                  >
                    Todas ({totalInDate})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterStatus === "PENDING"
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}
                  onPress={() => setFilterStatus("PENDING")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterStatus === "PENDING" ? "#0F172A" : theme.textSecondary },
                    ]}
                  >
                    Pendentes ({pendingInDate})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterStatus === "COMPLETED"
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}
                  onPress={() => setFilterStatus("COMPLETED")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterStatus === "COMPLETED" ? "#0F172A" : theme.textSecondary },
                    ]}
                  >
                    Concluídas ({completionsInDate})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 5. Lista de Rotinas na Timeline ou Empty State Proativo */}
          {totalInDate === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={44}
                color={theme.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {isViewingToday ? "Nada agendado para hoje" : "Nenhuma rotina para este dia"}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Crie uma rotina personalizada ou aplique um modelo pronto com um clique.
              </Text>

              {/* Botões de Ação Direta no Card Vazio */}
              <View style={styles.emptyActionsRow}>
                <TouchableOpacity
                  style={[styles.emptyActionBtnPrimary, { backgroundColor: theme.primary }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setHabitToEdit(null);
                    setIsAddModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={18} color="#0F172A" />
                  <Text style={styles.emptyActionBtnPrimaryText}>Nova Rotina</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.emptyActionBtnSecondary,
                    { borderColor: theme.outline, backgroundColor: theme.surfaceElevated },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => router.push("/templates" as any)}
                >
                  <Ionicons name="layers-outline" size={17} color={theme.textPrimary} />
                  <Text style={[styles.emptyActionBtnSecondaryText, { color: theme.textPrimary }]}>
                    Usar Template
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : filteredHabits.length === 0 ? (
            <View
              style={[
                styles.emptyFilterContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}
            >
              <Ionicons
                name={filterStatus === "PENDING" ? "checkmark-done-circle-outline" : "hourglass-outline"}
                size={36}
                color={theme.primary}
              />
              <Text style={[styles.emptyFilterTitle, { color: theme.textPrimary }]}>
                {filterStatus === "PENDING"
                  ? "Todas as rotinas foram concluídas! 🎉"
                  : "Nenhuma rotina concluída até o momento."}
              </Text>
              <TouchableOpacity
                onPress={() => setFilterStatus("ALL")}
                style={[styles.resetFilterBtn, { borderColor: theme.outline }]}
              >
                <Text style={[styles.resetFilterBtnText, { color: theme.primary }]}>
                  Ver Todas as Rotinas
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.timelineList,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}
            >
              {filteredHabits.map((habit, index) => {
                const category = categories.find(
                  (c) => c.id === habit.categoryId,
                ) || {
                  id: "default",
                  name: "Geral",
                  color: theme.primary,
                };

                const isSelected = selectedHabitIds.includes(habit.id);

                return (
                  <TimelineEventItem
                    key={habit.id}
                    item={habit}
                    category={category}
                    isChecked={habit.completed}
                    isFirst={index === 0}
                    isLast={index === filteredHabits.length - 1}
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
                      } else {
                        handleToggleSelectHabit(habit.id);
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
            style={[
              styles.fab,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
            ]}
            activeOpacity={0.85}
            onPress={() => {
              setHabitToEdit(null);
              setIsAddModalVisible(true);
            }}
          >
            <Ionicons
              name="add"
              size={30}
              color={getContrastTextColor(theme.primary)}
            />
          </TouchableOpacity>
        )}

        {/* Modal de Detalhes do Evento com Atalho de Iniciar Foco */}
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
          onStartFocus={() => {
            setSelectedDetailHabit(null);
            router.push("/focus" as any);
          }}
        />

        {/* Modal de Criação / Edição de Rotina */}
        <NewHabitModal
          visible={isAddModalVisible}
          habitToEdit={habitToEdit}
          initialDate={selectedDateStr}
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    ...(Platform.OS === "web" ? { minHeight: "100vh" as any } : {}),
  },
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    width: "100%",
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: "center",
  },
  selectionTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: 12,
    backgroundColor: MomentusColors.navySurface,
    borderBottomWidth: 1,
    borderBottomColor: MomentusColors.navyOutline,
  },
  selectionCountText: {
    fontSize: 16,
    fontWeight: "800",
    color: MomentusColors.textPrimary,
  },
  selectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: ComponentHeightTokens.chip,
    height: ComponentHeightTokens.chip,
    borderRadius: ComponentHeightTokens.chip / 2,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userProfileGreetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandSymbolBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  brandSymbolImg: {
    width: 26,
    height: 16,
  },
  homeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  homeAvatarImage: {
    width: "100%",
    height: "100%",
  },
  homeAvatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  greetingText: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
    fontWeight: "600",
  },
  userNameText: {
    fontSize: 24,
    fontWeight: "900",
    color: MomentusColors.textPrimary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  dateSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  dateInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateSubHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  backTodayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  backTodayBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  dateStripContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 6,
  },
  dateStripItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  dateStripDayName: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateStripDayNum: {
    fontSize: 15,
  },
  dateDotContainer: {
    height: 6,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dateStripDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dateStripDotEmpty: {
    width: 5,
    height: 5,
  },
  streakCardContainer: {
    marginBottom: 24,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  streakGlassCard: {
    padding: 18,
  },
  streakCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakInfoCol: {
    flex: 1,
    paddingRight: 12,
  },
  streakLabel: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    fontWeight: "600",
  },
  streakNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  streakNumberText: {
    fontSize: 22,
    fontWeight: "900",
    color: MomentusColors.textPrimary,
  },
  gamificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
    flexWrap: "wrap",
  },
  gamificationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  gamificationChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  motivationalText: {
    fontSize: 13,
    fontWeight: "700",
    color: MomentusColors.emeraldNeon,
    marginTop: 4,
    lineHeight: 18,
  },
  perfectDayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  perfectDayBannerText: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  circularProgressContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TypographyTokens.sectionHeader,
    color: MomentusColors.textPrimary,
  },
  sectionCountText: {
    ...TypographyTokens.screenSubtitle,
    color: MomentusColors.textSecondary,
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyTitle: {
    ...TypographyTokens.cardTitle,
    color: MomentusColors.textPrimary,
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    ...TypographyTokens.screenSubtitle,
    color: MomentusColors.textSecondary,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
  },
  emptyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emptyActionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  emptyActionBtnPrimaryText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyActionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  emptyActionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyFilterContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  resetFilterBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  timelineList: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    paddingVertical: 12,
  },
  fab: {
    position: "absolute",
    right: LayoutTokens.pagePaddingHorizontal,
    bottom: 24,
    width: ComponentHeightTokens.fab,
    height: ComponentHeightTokens.fab,
    borderRadius: ComponentHeightTokens.fab / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
});

