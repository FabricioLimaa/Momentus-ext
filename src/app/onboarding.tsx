import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  MomentusColors,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
} from '@/constants/theme';

const { width } = Dimensions.get('window');

const ONBOARDING_PAGES = [
  {
    icon: 'calendar-outline' as const,
    title: 'Bem-vindo ao Momentus',
    description: 'Organize sua rotina e transforme seus hábitos em eventos concretos.',
  },
  {
    icon: 'grid-outline' as const,
    title: 'Crie Templates',
    description: 'Monte sua semana ideal criando templates de rotina reutilizáveis.',
  },
  {
    icon: 'sync-outline' as const,
    title: 'Aplique e Sincronize',
    description: 'Aplique seus templates para semanas ou meses e sincronize tudo com sua Agenda Google.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);

  const handleFinish = () => {
    router.replace('/' as any);
  };

  const handleNext = () => {
    if (currentPage < ONBOARDING_PAGES.length - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const current = ONBOARDING_PAGES[currentPage];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        {/* Top Skip button */}
        <View style={styles.topBar}>
          {currentPage < ONBOARDING_PAGES.length - 1 ? (
            <TouchableOpacity onPress={handleFinish} style={styles.skipButton}>
              <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 40 }} />
          )}
        </View>

        {/* Center Content */}
        <View style={styles.centerContent}>
          <View style={styles.iconCircle}>
            <Ionicons name={current.icon} size={64} color={MomentusColors.emeraldNeon} />
          </View>

          <Text style={styles.slideTitle}>{current.title}</Text>
          <Text style={styles.slideDescription}>{current.description}</Text>
        </View>

        {/* Bottom Bar: Dots & Action */}
        <View style={styles.bottomBar}>
          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {ONBOARDING_PAGES.map((_, idx) => {
              const isActive = currentPage === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              );
            })}
          </View>

          {/* Action Button */}
          {currentPage === ONBOARDING_PAGES.length - 1 ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleFinish}
              activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Começar Agora</Text>
              <Ionicons name="arrow-forward" size={18} color="#0F172A" />
            </TouchableOpacity>
          ) : (
            <View style={styles.dualButtonsRow}>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.85}>
                <Text style={styles.nextButtonText}>Próximo</Text>
                <Ionicons name="chevron-forward" size={18} color="#0F172A" />
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
    backgroundColor: MomentusColors.navyBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    justifyContent: 'space-between',
    paddingHorizontal: SpacingTokens.lg,
    paddingBottom: SpacingTokens.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: SpacingTokens.md,
  },
  skipButton: {
    minHeight: ComponentHeightTokens.buttonCompact,
    minWidth: ComponentHeightTokens.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.sm,
  },
  skipText: {
    color: MomentusColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.md,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SpacingTokens.xxl,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    textAlign: 'center',
    marginBottom: SpacingTokens.sm,
  },
  slideDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: MomentusColors.textSecondary,
    textAlign: 'center',
    maxWidth: width * 0.8,
  },
  bottomBar: {
    alignItems: 'center',
    gap: SpacingTokens.lg,
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
    backgroundColor: MomentusColors.emeraldNeon,
  },
  dotInactive: {
    width: SpacingTokens.sm,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    backgroundColor: MomentusColors.emeraldNeon,
    width: '100%',
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
  },
  primaryButtonText: {
    color: '#0F172A',
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
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: SpacingTokens.lg,
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.button,
  },
  nextButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },
});

