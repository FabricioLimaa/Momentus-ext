import { CircularProgressRing } from "@/components/momentus/CircularProgressRing";
import { EventDetailDialog } from "@/components/momentus/EventDetailDialog";
import { GlassCard } from "@/components/momentus/GlassCard";
import { NewHabitModal } from "@/components/momentus/NewHabitModal";
import { TimelineEventItem } from "@/components/momentus/TimelineEventItem";
import { SplashScreen } from "@/components/momentus/SplashScreen";
import { AvatarWithFrame } from "@/components/momentus/AvatarWithFrame";
import { auth as firebaseAuth } from "@/config/firebase";
import {
  getStreakColor,
  getTodayDateString,
  formatFullDateDisplay,
} from "@/constants/initialData";
import {
  MomentusColors,
  getContrastTextColor,
  LayoutTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
  useResponsiveLayout,
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
    userLevel,
    theme,
    isLoaded,
    toggleHabit,
    deleteHabit,
    deleteMultipleHabits,
  } = useMomentus();

  const { isLargeScreen } = useResponsiveLayout();

  // Estados de modais
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [selectedDetailHabit, setSelectedDetailHabit] =
    useState<HabitItem | null>(null);

  // Estados de seleção múltipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);

  // Filtros rápidos da Home (Todas, Pendentes, Concluídas)
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  const authUser = firebaseAuth.currentUser;
  const resolvedName =
    userProfile.name && userProfile.name !== "Usuário"
      ? userProfile.name
      : authUser?.displayName?.trim() || userProfile.name || "Explorador";
  const userName = resolvedName.split(" ")[0] || "Explorador";
  const displayPhoto = userProfile.photoUrl || authUser?.photoURL || null;

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Hábitos do dia de hoje ordenados por horário de início
  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => h.date === todayStr)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  }, [habits, todayStr]);

  const totalToday = todayHabits.length;
  const completionsToday = todayHabits.filter((h) => h.completed).length;
  const pendingToday = totalToday - completionsToday;
  const progress = totalToday > 0 ? completionsToday / totalToday : 0;

  // Lista de hábitos filtrados pelo status (Todas, Pendentes ou Concluídas)
  const filteredHabits = useMemo(() => {
    if (filterStatus === "PENDING") {
      return todayHabits.filter((h) => !h.completed);
    }
    if (filterStatus === "COMPLETED") {
      return todayHabits.filter((h) => h.completed);
    }
    return todayHabits;
  }, [todayHabits, filterStatus]);

  // Data de hoje formatada por extenso
  const fullDateFormatted = useMemo(() => formatFullDateDisplay(todayStr), [todayStr]);

  // Frase motivacional contextualizada
  const motivationalText = useMemo(() => {
    if (totalToday === 0) return "Dia livre! Que tal planejar algo novo? ✨";
    if (completionsToday === 0) return "Vamos começar? O primeiro passo! 🚀";
    if (progress < 0.5) return "Ótimo começo! Continue focado. 💪";
    if (progress < 1.0) return "Mais da metade concluído! Você está quase lá. ⚡";
    return "Dia perfeito! Você conquistou todas as suas metas! 🏆";
  }, [totalToday, completionsToday, progress]);

  // Saudação por horário
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia,";
    if (hour < 18) return "Boa tarde,";
    return "Boa noite,";
  }, []);

  // Toggle seleção múltipla
  const handleToggleSelectHabit = (id: string) => {
    const next = selectedHabitIds.includes(id)
      ? selectedHabitIds.filter((item) => item !== id)
      : [...selectedHabitIds, id];
    setSelectedHabitIds(next);
    if (next.length === 0) {
      setIsSelectionMode(false);
    }
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

  const renderStreakCard = () => (
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
                  { backgroundColor: `${userLevel.rankColor}15`, borderColor: `${userLevel.rankColor}40` },
                ]}
              >
                <Ionicons name="trophy-outline" size={12} color={userLevel.rankColor} />
                <Text style={[styles.gamificationChipText, { color: userLevel.rankColor }]}>
                  Nv. {userLevel.level} • {userProfile.totalPoints || 0} XP
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
      </GlassCard>
    </TouchableOpacity>
  );

  const renderFocusShortcutCard = () => (
    <GlassCard
      style={[
        styles.focusShortcutCard,
        {
          backgroundColor: theme.glassCard,
          borderColor: theme.glassBorder,
        },
      ]}
    >
      <View style={styles.focusShortcutHeader}>
        <View
          style={[
            styles.focusShortcutIconBox,
            { backgroundColor: `${theme.primary}20` },
          ]}
        >
          <Ionicons name="timer-outline" size={24} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.focusShortcutTitle, { color: theme.textPrimary }]}>
            Sessão de Foco
          </Text>
          <Text style={[styles.focusShortcutSubtitle, { color: theme.textSecondary }]}>
            Timer Pomodoro com paisagens sonoras
          </Text>
        </View>
      </View>

      <View style={styles.focusShortcutFooter}>
        <TouchableOpacity
          style={[styles.focusShortcutButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => router.push("/focus" as any)}
        >
          <Ionicons name="play" size={16} color="#0F172A" />
          <Text style={styles.focusShortcutButtonText}>Iniciar Foco</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  const renderSectionHeader = () => (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Seu dia
        </Text>
        <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
          {completionsToday}/{totalToday} concluída{totalToday === 1 ? "" : "s"}
        </Text>
      </View>

      {/* Chips de Filtro Rápido */}
      {totalToday > 0 && (
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
              Todas ({totalToday})
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
              Pendentes ({pendingToday})
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
              Concluídas ({completionsToday})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderTimelineOrEmpty = () => {
    if (totalToday === 0) {
      return (
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
            Nada agendado para hoje
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
      );
    }

    if (filteredHabits.length === 0) {
      return (
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
      );
    }

    return (
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
    );
  };

  if (!isLoaded) {
    return <SplashScreen syncMessage="Preparando seu espaço..." />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top']}
    >
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            maxWidth: isLargeScreen
              ? LayoutTokens.maxDesktopContentWidth
              : LayoutTokens.maxContentWidth,
          },
        ]}
      >
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
                    selectedHabitIds.length === todayHabits.length &&
                    todayHabits.length > 0
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
          contentContainerStyle={[
            styles.scrollContent,
            isLargeScreen && styles.scrollContentDesktop,
            { paddingBottom: 110 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header de Saudação & Identidade Visual Oficial da Marca */}
          <View style={styles.homeHeader}>
            <TouchableOpacity
              onPress={() => router.push("/more" as any)}
              style={styles.userProfileGreetingRow}
              activeOpacity={0.8}
            >
              <AvatarWithFrame
                photoUrl={displayPhoto}
                name={resolvedName}
                size={42}
                frameId={userProfile.selectedAvatarFrame}
                userLevel={userLevel}
                totalFocusMinutes={userProfile.focusMinutesToday || 0}
                currentStreak={userProfile.currentStreak}
                bestStreak={userProfile.bestStreak}
              />
              <View style={{ marginLeft: 8 }}>
                <Text
                  style={[styles.greetingText, { color: theme.textSecondary }]}
                >
                  {greeting}
                </Text>
                <Text
                  style={[styles.userNameText, { color: theme.textPrimary }]}
                >
                  {userName}
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

          {/* Subcabeçalho com Data de Hoje por Extenso */}
          <View style={styles.dateSubHeader}>
            <View style={styles.dateInfoRow}>
              <Ionicons name="calendar-outline" size={15} color={theme.primary} />
              <Text style={[styles.dateSubHeaderText, { color: theme.textSecondary }]}>
                {fullDateFormatted}
              </Text>
            </View>
          </View>

          {/* Conteúdo Principal Adaptativo: 2 Colunas em Telas Grandes, Coluna Única em Celular */}
          {isLargeScreen ? (
            <View style={styles.desktopColumnsRow}>
              {/* Coluna Esquerda: Timeline e Ações do Dia */}
              <View style={styles.desktopLeftCol}>
                {renderSectionHeader()}
                {renderTimelineOrEmpty()}
              </View>

              {/* Coluna Direita: Gamificação, Sequência e Atalho Foco */}
              <View style={styles.desktopRightCol}>
                {renderStreakCard()}
                {renderFocusShortcutCard()}
              </View>
            </View>
          ) : (
            <>
              {renderStreakCard()}
              {renderSectionHeader()}
              {renderTimelineOrEmpty()}
            </>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Floating Action Button (+) Sempre Visível com Z-Index Elevado */}
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
            accessibilityRole="button"
            accessibilityLabel="Criar nova rotina"
          >
            <Ionicons
              name="add"
              size={30}
              color={getContrastTextColor(theme.primary)}
            />
          </TouchableOpacity>
        )}

        {/* Modal de Detalhes do Evento com Atalho de Iniciar Foco com a Rotina Vinculada */}
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
            if (selectedDetailHabit) {
              const targetHabitId = selectedDetailHabit.id;
              setSelectedDetailHabit(null);
              router.push({
                pathname: "/focus",
                params: { habitId: targetHabitId },
              } as any);
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    width: "100%",
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: "center",
    position: "relative",
  },
  selectionTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: SpacingTokens.sm,
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
    gap: SpacingTokens.sm,
  },
  iconButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
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
  },
  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SpacingTokens.md,
  },
  userProfileGreetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.md,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.sm,
  },
  brandSymbolBadge: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
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
    width: ComponentHeightTokens.buttonModal,
    height: ComponentHeightTokens.buttonModal,
    borderRadius: ComponentHeightTokens.buttonModal / 2,
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
    fontSize: 22,
    fontWeight: "900",
    color: MomentusColors.textPrimary,
    marginTop: 2,
  },
  notificationButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  dateSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SpacingTokens.md,
  },
  dateInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.xs,
  },
  dateSubHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  streakCardContainer: {
    marginBottom: SpacingTokens.lg,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
  },
  streakGlassCard: {
    padding: SpacingTokens.lg,
  },
  streakCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakInfoCol: {
    flex: 1,
    paddingRight: SpacingTokens.md,
  },
  streakLabel: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    fontWeight: "600",
  },
  streakNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.sm,
    marginVertical: SpacingTokens.xs,
  },
  streakNumberText: {
    fontSize: 22,
    fontWeight: "900",
    color: MomentusColors.textPrimary,
  },
  gamificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.sm,
    marginVertical: SpacingTokens.xs,
    flexWrap: "wrap",
  },
  gamificationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.xs,
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.sm,
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
    marginTop: SpacingTokens.xs,
    lineHeight: 18,
  },
  circularProgressContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "column",
    gap: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
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
    gap: SpacingTokens.sm,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: SpacingTokens.md,
    height: ComponentHeightTokens.chip,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadiusTokens.sm,
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
    paddingVertical: SpacingTokens.xxl,
    paddingHorizontal: SpacingTokens.lg,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    marginTop: SpacingTokens.sm,
  },
  emptyTitle: {
    ...TypographyTokens.cardTitle,
    color: MomentusColors.textPrimary,
    marginTop: SpacingTokens.md,
    textAlign: "center",
  },
  emptySubtitle: {
    ...TypographyTokens.screenSubtitle,
    color: MomentusColors.textSecondary,
    marginTop: SpacingTokens.xs,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
  },
  emptyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.md,
    marginTop: SpacingTokens.lg,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  emptyActionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: SpacingTokens.xs,
    height: ComponentHeightTokens.buttonCompact,
    paddingHorizontal: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.control,
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
    gap: SpacingTokens.xs,
    height: ComponentHeightTokens.buttonCompact,
    paddingHorizontal: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.control,
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
    paddingVertical: SpacingTokens.xl,
    paddingHorizontal: SpacingTokens.lg,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    marginTop: SpacingTokens.sm,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: SpacingTokens.sm,
    textAlign: "center",
  },
  resetFilterBtn: {
    marginTop: SpacingTokens.md,
    paddingHorizontal: SpacingTokens.md,
    height: ComponentHeightTokens.chip,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadiusTokens.sm,
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
    paddingVertical: SpacingTokens.sm,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  scrollContentDesktop: {
    paddingHorizontal: SpacingTokens.xl,
    paddingTop: SpacingTokens.xl,
  },
  desktopColumnsRow: {
    flexDirection: 'row',
    gap: SpacingTokens.xl,
    alignItems: 'flex-start',
  },
  desktopLeftCol: {
    flex: 1.4,
    minWidth: 0,
  },
  desktopRightCol: {
    flex: 1,
    minWidth: 320,
    gap: SpacingTokens.lg,
  },
  focusShortcutCard: {
    padding: SpacingTokens.lg,
    borderRadius: BorderRadiusTokens.card,
  },
  focusShortcutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
  },
  focusShortcutIconBox: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusShortcutTitle: {
    ...TypographyTokens.cardTitle,
    fontSize: 16,
  },
  focusShortcutSubtitle: {
    ...TypographyTokens.screenSubtitle,
    fontSize: 12,
    marginTop: 2,
  },
  focusShortcutFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  focusShortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    height: ComponentHeightTokens.buttonCompact,
    paddingHorizontal: SpacingTokens.lg,
    borderRadius: BorderRadiusTokens.control,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  focusShortcutButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
});
