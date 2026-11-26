import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  MomentusColors,
  LayoutTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  IconSize,
  getContrastTextColor,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString } from '@/constants/initialData';

interface StarterHabitOption {
  id: string;
  title: string;
  description: string;
  timeStart: string;
  timeEnd: string;
  categoryHint: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}

const MAX_STARTER_SELECTIONS = 3;

const STARTER_HABITS: StarterHabitOption[] = [
  {
    id: 'starter-water',
    title: 'Beber 2L de Água',
    description: 'Hidratação constante para energia e clareza mental',
    timeStart: '09:00',
    timeEnd: '09:15',
    categoryHint: 'Saúde',
    icon: 'water-outline',
    accentColor: '#38BDF8',
  },
  {
    id: 'starter-focus',
    title: '30 min de Foco',
    description: 'Um bloco Pomodoro sem distrações na sua prioridade do dia',
    timeStart: '10:00',
    timeEnd: '10:30',
    categoryHint: 'Trabalho',
    icon: 'timer-outline',
    accentColor: '#34D399',
  },
  {
    id: 'starter-reading',
    title: 'Leitura Noturna',
    description: 'Desacelere a mente com 20 minutos de leitura antes de dormir',
    timeStart: '21:30',
    timeEnd: '21:55',
    categoryHint: 'Estudos',
    icon: 'book-outline',
    accentColor: '#A855F7',
  },
  {
    id: 'starter-stretch',
    title: 'Alongamento & Movimento',
    description: 'Pausa ativa de 20 minutos para postura e bem-estar físico',
    timeStart: '18:00',
    timeEnd: '18:20',
    categoryHint: 'Saúde',
    icon: 'walk-outline',
    accentColor: '#10B981',
  },
  {
    id: 'starter-priorities',
    title: 'Planejar 3 Prioridades',
    description: 'Comece o dia escolhendo o que realmente importa',
    timeStart: '08:00',
    timeEnd: '08:15',
    categoryHint: 'Trabalho',
    icon: 'checkbox-outline',
    accentColor: '#F59E0B',
  },
];

const ONBOARDING_PAGES = [
  {
    id: 'welcome',
    icon: 'calendar-outline' as const,
    title: 'Bem-vindo ao Momentus',
    description: 'Organize sua rotina com leveza e transforme seus hábitos em eventos concretos.',
    isInteractive: false,
  },
  {
    id: 'templates',
    icon: 'grid-outline' as const,
    title: 'Templates & Foco Profundo',
    description: 'Monte sua semana ideal com rotinas reutilizáveis e sessões de Pomodoro com sons ambientes.',
    isInteractive: false,
  },
  {
    id: 'sync',
    icon: 'sync-outline' as const,
    title: 'Evolução & Sincronização',
    description: 'Sincronize tudo com o Google Agenda, acompanhe seus picos de foco e evolua com XP.',
    isInteractive: false,
  },
  {
    id: 'starter_habits',
    icon: 'sparkles-outline' as const,
    title: 'Escolha seus 1ºs Hábitos',
    description: 'Selecione de 1 a 3 hábitos essenciais para já começar o dia de hoje em movimento.',
    isInteractive: true,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const {
    theme,
    categories,
    habits,
    userProfile,
    addHabit,
    updateSettings,
    triggerHaptic,
  } = useMomentus();

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedStarterIds, setSelectedStarterIds] = useState<string[]>([
    'starter-water',
    'starter-focus',
  ]);

  const primaryColor = theme.primary || MomentusColors.emeraldNeon;
  const primaryContrast = getContrastTextColor(primaryColor);

  const resolveCategoryId = (hint: string): string => {
    const normalized = hint.trim().toLowerCase();
    const match = categories.find(
      (c) =>
        c.name.trim().toLowerCase() === normalized ||
        c.name.trim().toLowerCase().includes(normalized)
    );
    if (match) return match.id;
    const defaultCat = categories.find(
      (c) => c.id === 'cat-outros' || c.name.trim().toLowerCase() === 'outros'
    );
    return defaultCat?.id || categories[0]?.id || 'cat-outros';
  };

  const toggleStarterHabit = (id: string) => {
    if (selectedStarterIds.includes(id)) {
      triggerHaptic('selection');
      setSelectedStarterIds((prev) => prev.filter((item) => item !== id));
      return;
    }
    if (selectedStarterIds.length >= MAX_STARTER_SELECTIONS) {
      triggerHaptic('impact');
      return;
    }
    triggerHaptic('selection');
    setSelectedStarterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const navigateAfterOnboarding = () => {
    if (userProfile.isLoggedIn) {
      router.replace('/home');
    } else {
      router.replace('/');
    }
  };

  const handleSkip = () => {
    updateSettings({ hasCompletedOnboarding: true });
    navigateAfterOnboarding();
  };

  const handleFinish = () => {
    const todayStr = getTodayDateString();
    const existingTodayTitles = new Set(
      habits
        .filter((h) => h.date === todayStr)
        .map((h) => h.title.trim().toLowerCase())
    );

    const chosenOptions = STARTER_HABITS.filter((opt) =>
      selectedStarterIds.includes(opt.id)
    );

    chosenOptions.forEach((opt) => {
      if (!existingTodayTitles.has(opt.title.trim().toLowerCase())) {
        addHabit({
          title: opt.title,
          description: opt.description,
          timeStart: opt.timeStart,
          timeEnd: opt.timeEnd,
          categoryId: resolveCategoryId(opt.categoryHint),
          date: todayStr,
          templateSourceId: 'onboarding_starter',
        });
      }
    });

    updateSettings({ hasCompletedOnboarding: true });
    triggerHaptic('success');
    navigateAfterOnboarding();
  };

  const handleNext = () => {
    triggerHaptic('selection');
    if (currentPage < ONBOARDING_PAGES.length - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      triggerHaptic('selection');
      setCurrentPage((prev) => prev - 1);
    }
  };

  const current = ONBOARDING_PAGES[currentPage];
  const isLastSlide = currentPage === ONBOARDING_PAGES.length - 1;
  const selectedCount = selectedStarterIds.length;

  const ctaLabel =
    selectedCount > 0
      ? `Começar com ${selectedCount} ${selectedCount === 1 ? 'hábito' : 'hábitos'}`
      : 'Começar Agora';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Bar: Voltar / Pular */}
        <View style={styles.topBar}>
          {currentPage > 0 ? (
            <TouchableOpacity
              onPress={handlePrev}
              style={styles.topActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Voltar etapa">
              <Ionicons name="chevron-back" size={IconSize.md} color={theme.textSecondary} />
              <Text style={[styles.topActionText, { color: theme.textSecondary }]}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.topSpacer} />
          )}

          <TouchableOpacity
            onPress={handleSkip}
            style={styles.topActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Pular apresentação">
            <Text style={[styles.topActionText, { color: theme.textSecondary }]}>
              {isLastSlide ? 'Pular por agora' : 'Pular'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center Content */}
        {current.isInteractive ? (
          <ScrollView
            style={styles.interactiveScroll}
            contentContainerStyle={styles.interactiveContent}
            showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.interactiveHeaderIcon,
                {
                  backgroundColor: `${primaryColor}18`,
                  borderColor: `${primaryColor}40`,
                },
              ]}>
              <Ionicons name={current.icon} size={IconSize.xl} color={primaryColor} />
            </View>

            <Text style={[styles.slideTitle, { color: theme.textPrimary }]}>
              {current.title}
            </Text>
            <Text style={[styles.slideDescription, { color: theme.textSecondary }]}>
              {current.description}
            </Text>

            {/* Contador de Seleção */}
            <View
              style={[
                styles.selectionCounterPill,
                {
                  backgroundColor: theme.surface,
                  borderColor: selectedCount > 0 ? `${primaryColor}55` : theme.outline,
                },
              ]}>
              <Ionicons
                name={selectedCount > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                size={IconSize.sm}
                color={selectedCount > 0 ? primaryColor : theme.textSecondary}
              />
              <Text
                style={[
                  styles.selectionCounterText,
                  { color: selectedCount > 0 ? primaryColor : theme.textSecondary },
                ]}>
                {selectedCount} de {MAX_STARTER_SELECTIONS} selecionados
              </Text>
            </View>

            {/* Lista de Hábitos Essenciais de Partida */}
            <View style={styles.starterList}>
              {STARTER_HABITS.map((opt) => {
                const isSelected = selectedStarterIds.includes(opt.id);
                const isDisabled = !isSelected && selectedCount >= MAX_STARTER_SELECTIONS;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.8}
                    onPress={() => toggleStarterHabit(opt.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                    style={[
                      styles.starterCard,
                      {
                        backgroundColor: isSelected ? `${primaryColor}14` : theme.surface,
                        borderColor: isSelected ? primaryColor : theme.outline,
                      },
                      isDisabled && styles.starterCardDisabled,
                    ]}>
                    <View
                      style={[
                        styles.starterIconBox,
                        { backgroundColor: `${opt.accentColor}20` },
                      ]}>
                      <Ionicons name={opt.icon} size={IconSize.md} color={opt.accentColor} />
                    </View>

                    <View style={styles.starterTextCol}>
                      <View style={styles.starterTitleRow}>
                        <Text
                          style={[styles.starterTitle, { color: theme.textPrimary }]}
                          numberOfLines={1}>
                          {opt.title}
                        </Text>
                        <Text style={[styles.starterTime, { color: theme.textSecondary }]}>
                          {opt.timeStart}
                        </Text>
                      </View>
                      <Text
                        style={[styles.starterDesc, { color: theme.textSecondary }]}
                        numberOfLines={2}>
                        {opt.description}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.starterCheckCircle,
                        {
                          borderColor: isSelected ? primaryColor : theme.outline,
                          backgroundColor: isSelected ? primaryColor : 'transparent',
                        },
                      ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={IconSize.sm} color={primaryContrast} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.centerContent}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: `${primaryColor}18`,
                  borderColor: `${primaryColor}40`,
                },
              ]}>
              <Ionicons name={current.icon} size={IconSize.illustration} color={primaryColor} />
            </View>

            <Text style={[styles.slideTitle, { color: theme.textPrimary }]}>
              {current.title}
            </Text>
            <Text style={[styles.slideDescription, { color: theme.textSecondary }]}>
              {current.description}
            </Text>
          </View>
        )}

        {/* Bottom Bar: Dots & Action */}
        <View style={styles.bottomBar}>
          <View style={styles.dotsRow}>
            {ONBOARDING_PAGES.map((page, idx) => {
              const isActive = currentPage === idx;
              return (
                <View
                  key={page.id}
                  style={[
                    styles.dot,
                    isActive
                      ? [styles.dotActive, { backgroundColor: primaryColor }]
                      : [styles.dotInactive, { backgroundColor: `${primaryColor}35` }],
                  ]}
                />
              );
            })}
          </View>

          {isLastSlide ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: primaryColor }]}
              onPress={handleFinish}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}>
              <Text style={[styles.primaryButtonText, { color: primaryContrast }]}>
                {ctaLabel}
              </Text>
              <Ionicons name="arrow-forward" size={IconSize.md} color={primaryContrast} />
            </TouchableOpacity>
          ) : (
            <View style={styles.dualButtonsRow}>
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: primaryColor }]}
                onPress={handleNext}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Próxima etapa">
                <Text style={[styles.nextButtonText, { color: primaryContrast }]}>Próximo</Text>
                <Ionicons name="chevron-forward" size={IconSize.md} color={primaryContrast} />
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: SpacingTokens.lg,
    paddingBottom: SpacingTokens.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SpacingTokens.md,
  },
  topSpacer: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
  },
  topActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    minHeight: ComponentHeightTokens.iconButton,
    paddingHorizontal: SpacingTokens.sm,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  topActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.md,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SpacingTokens.xxl,
  },
  interactiveScroll: {
    flex: 1,
    width: '100%',
  },
  interactiveContent: {
    alignItems: 'center',
    paddingTop: SpacingTokens.sm,
    paddingBottom: SpacingTokens.lg,
  },
  interactiveHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SpacingTokens.md,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: SpacingTokens.sm,
  },
  slideDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 440,
  },
  selectionCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.pill,
    borderWidth: 1,
    marginTop: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
  },
  selectionCounterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  starterList: {
    width: '100%',
    gap: SpacingTokens.sm,
  },
  starterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1.5,
    gap: SpacingTokens.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  starterCardDisabled: {
    opacity: 0.5,
  },
  starterIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadiusTokens.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterTextCol: {
    flex: 1,
    gap: SpacingTokens.xs,
  },
  starterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SpacingTokens.sm,
  },
  starterTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  starterTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  starterDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  starterCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    gap: SpacingTokens.lg,
    paddingTop: SpacingTokens.md,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  dot: {
    height: SpacingTokens.sm,
    borderRadius: SpacingTokens.xs,
  },
  dotActive: {
    width: SpacingTokens.lg,
  },
  dotInactive: {
    width: SpacingTokens.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    width: '100%',
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  primaryButtonText: {
    fontWeight: '800',
    fontSize: 16,
  },
  dualButtonsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.lg,
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.button,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  nextButtonText: {
    fontWeight: '800',
    fontSize: 15,
  },
});
