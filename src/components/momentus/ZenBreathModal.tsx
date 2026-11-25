import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  IconSize,
  getContrastTextColor,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

type BreathPhaseKey = 'INHALE' | 'HOLD' | 'EXHALE';

interface BreathPhaseConfig {
  key: BreathPhaseKey;
  label: string;
  guidance: string;
  durationSec: number;
  accentColor: string;
}

const BREATH_PHASES: BreathPhaseConfig[] = [
  {
    key: 'INHALE',
    label: 'Inspire',
    guidance: 'Puxe o ar suavemente pelo nariz',
    durationSec: 4,
    accentColor: '#34D399', // Esmeralda Neon
  },
  {
    key: 'HOLD',
    label: 'Segure',
    guidance: 'Mantenha o peito sereno e relaxado',
    durationSec: 7,
    accentColor: '#38BDF8', // Ciano Luminoso
  },
  {
    key: 'EXHALE',
    label: 'Expire',
    guidance: 'Solte o ar devagar, liberando a tensão',
    durationSec: 8,
    accentColor: '#A78BFA', // Violeta Calmo
  },
];

interface ZenBreathModalProps {
  visible: boolean;
  breakLabel: string;
  breakTimeFormatted: string;
  isBreakRunning: boolean;
  onToggleBreakTimer: () => void;
  onClose: () => void;
}

export const ZenBreathModal: React.FC<ZenBreathModalProps> = ({
  visible,
  breakLabel,
  breakTimeFormatted,
  isBreakRunning,
  onToggleBreakTimer,
  onClose,
}) => {
  const { theme, triggerHaptic } = useMomentus();
  const { width, height } = useWindowDimensions();

  const [isBreathingActive, setIsBreathingActive] = useState(true);
  const [hideClock, setHideClock] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(BREATH_PHASES[0].durationSec);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Valores animados via useState (compatível com React 19 react-hooks/refs)
  const useNative = Platform.OS !== 'web';
  const [orbScale] = useState(() => new Animated.Value(0.64));
  const [midRingScale] = useState(() => new Animated.Value(0.76));
  const [outerGlowScale] = useState(() => new Animated.Value(0.84));
  const [outerGlowOpacity] = useState(() => new Animated.Value(0.18));
  const [textOpacity] = useState(() => new Animated.Value(1));

  const phaseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const triggerHapticRef = useRef(triggerHaptic);

  useEffect(() => {
    triggerHapticRef.current = triggerHaptic;
  }, [triggerHaptic]);

  // Reinicia ciclo limpo ao abrir o modal
  useEffect(() => {
    if (visible) {
      setIsBreathingActive(true);
      setPhaseIndex(0);
      setPhaseSecondsLeft(BREATH_PHASES[0].durationSec);
      setCompletedCycles(0);
      orbScale.setValue(0.64);
      midRingScale.setValue(0.76);
      outerGlowScale.setValue(0.84);
      outerGlowOpacity.setValue(0.18);
    } else {
      phaseAnimRef.current?.stop();
    }
  }, [visible, orbScale, midRingScale, outerGlowScale, outerGlowOpacity]);

  const currentPhase = BREATH_PHASES[phaseIndex] || BREATH_PHASES[0];

  // Coreografia física da esfera neon conforme a fase 4-7-8
  useEffect(() => {
    if (!visible || !isBreathingActive) {
      phaseAnimRef.current?.stop();
      return;
    }

    const phase = BREATH_PHASES[phaseIndex];
    const durationMs = phase.durationSec * 1000;

    // Feedback háptico sutil na troca de fase (sem perturbar o relaxamento)
    triggerHapticRef.current(phase.key === 'HOLD' ? 'selection' : 'light');

    // Crossfade gentil da instrução textual
    textOpacity.setValue(0.45);
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();

    phaseAnimRef.current?.stop();

    if (phase.key === 'INHALE') {
      phaseAnimRef.current = Animated.parallel([
        Animated.timing(orbScale, {
          toValue: 1.12,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(midRingScale, {
          toValue: 1.28,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(outerGlowScale, {
          toValue: 1.48,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(outerGlowOpacity, {
          toValue: 0.42,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
      ]);
    } else if (phase.key === 'HOLD') {
      // Plenitude luminosa com micro-pulsação hipnótica sutil durante os 7s
      phaseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(orbScale, {
              toValue: 1.15,
              duration: 1750,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: useNative,
            }),
            Animated.timing(outerGlowScale, {
              toValue: 1.56,
              duration: 1750,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: useNative,
            }),
            Animated.timing(outerGlowOpacity, {
              toValue: 0.5,
              duration: 1750,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: useNative,
            }),
          ]),
          Animated.parallel([
            Animated.timing(orbScale, {
              toValue: 1.1,
              duration: 1750,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: useNative,
            }),
            Animated.timing(outerGlowScale, {
              toValue: 1.46,
              duration: 1750,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: useNative,
            }),
            Animated.timing(outerGlowOpacity, {
              toValue: 0.36,
              duration: 1750,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: useNative,
            }),
          ]),
        ])
      );
    } else {
      // EXHALE (8s): contração lenta e restauradora
      phaseAnimRef.current = Animated.parallel([
        Animated.timing(orbScale, {
          toValue: 0.64,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(midRingScale, {
          toValue: 0.76,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(outerGlowScale, {
          toValue: 0.84,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(outerGlowOpacity, {
          toValue: 0.16,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
      ]);
    }

    phaseAnimRef.current.start();

    return () => {
      phaseAnimRef.current?.stop();
    };
  }, [
    visible,
    isBreathingActive,
    phaseIndex,
    orbScale,
    midRingScale,
    outerGlowScale,
    outerGlowOpacity,
    textOpacity,
    useNative,
  ]);

  // Contador regressivo segundo a segundo de cada fase 4-7-8
  useEffect(() => {
    if (!visible || !isBreathingActive) return;

    const interval = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        setPhaseIndex((currIdx) => {
          const nextIdx = (currIdx + 1) % BREATH_PHASES.length;
          if (nextIdx === 0) {
            setCompletedCycles((c) => c + 1);
          }
          setPhaseSecondsLeft(BREATH_PHASES[nextIdx].durationSec);
          return nextIdx;
        });

        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, isBreathingActive]);

  const orbBaseSize = Math.min(200, Math.max(152, Math.min(width, height) * 0.44));
  const bgColor = theme.isOled ? MomentusColors.oledBackground : '#030816';
  const accent = currentPhase.accentColor;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle="light-content" backgroundColor={bgColor} />

        {/* Topo minimalista: Título Zen Breath + Tempo discreto da pausa + Fechar */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <View style={[styles.badgePill, { backgroundColor: `${accent}20`, borderColor: `${accent}50` }]}>
              <Ionicons name="leaf-outline" size={IconSize.xs} color={accent} />
              <Text style={[styles.badgeText, { color: accent }]}>ZEN BREATH • 4-7-8</Text>
            </View>
            <Text style={styles.breakContextText}>
              {breakLabel}
              {completedCycles > 0
                ? ` • ${completedCycles} ${completedCycles === 1 ? 'ciclo' : 'ciclos'}`
                : ''}
            </Text>
          </View>

          <View style={styles.topActions}>
            {/* Ocultar/exibir relógio para eliminar ansiedade temporal */}
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('selection');
                setHideClock((prev) => !prev);
              }}
              style={styles.iconBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={hideClock ? 'Exibir tempo restante da pausa' : 'Ocultar tempo restante da pausa'}>
              <Ionicons
                name={hideClock ? 'eye-off-outline' : 'eye-outline'}
                size={IconSize.md}
                color="rgba(248, 250, 252, 0.72)"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={styles.iconBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Fechar Pausa Consciente Zen Breath">
              <Ionicons name="close" size={IconSize.lg} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pílula sutil do tempo restante da pausa (oculta se o usuário ativar Modo Sem Relógio) */}
        <View style={styles.clockSlot}>
          {!hideClock ? (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('selection');
                onToggleBreakTimer();
              }}
              activeOpacity={0.8}
              style={styles.subtleClockPill}
              accessibilityRole="button"
              accessibilityLabel={
                isBreakRunning
                  ? `Pausa em andamento: ${breakTimeFormatted}. Toque para pausar`
                  : `Pausa pausada em ${breakTimeFormatted}. Toque para retomar`
              }>
              <Ionicons
                name={isBreakRunning ? 'time-outline' : 'pause-circle-outline'}
                size={IconSize.sm}
                color="rgba(248, 250, 252, 0.65)"
              />
              <Text style={styles.subtleClockText}>
                {isBreakRunning ? `Restam ${breakTimeFormatted}` : `Pausado • ${breakTimeFormatted}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.clockHiddenText}>Sem relógio — apenas respire</Text>
          )}
        </View>

        {/* Centro: Esfera Neon Luminosa Pulsante */}
        <View style={styles.orbStage}>
          {/* Camada 1: Aura atmosférica externa */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.outerGlow,
              {
                width: orbBaseSize,
                height: orbBaseSize,
                borderRadius: orbBaseSize / 2,
                backgroundColor: accent,
                opacity: outerGlowOpacity,
                transform: [{ scale: outerGlowScale }],
              },
            ]}
          />

          {/* Camada 2: Anel vítreo intermediário */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.midRing,
              {
                width: orbBaseSize,
                height: orbBaseSize,
                borderRadius: orbBaseSize / 2,
                borderColor: `${accent}66`,
                backgroundColor: `${accent}1A`,
                transform: [{ scale: midRingScale }],
              },
            ]}
          />

          {/* Camada 3: Esfera Neon Central */}
          <Animated.View
            style={[
              styles.coreOrb,
              {
                width: orbBaseSize,
                height: orbBaseSize,
                borderRadius: orbBaseSize / 2,
                backgroundColor: `${accent}2E`,
                borderColor: accent,
                shadowColor: accent,
                transform: [{ scale: orbScale }],
              },
            ]}>
            <View
              style={[
                styles.coreInnerGlow,
                {
                  width: orbBaseSize * 0.68,
                  height: orbBaseSize * 0.68,
                  borderRadius: (orbBaseSize * 0.68) / 2,
                  backgroundColor: `${accent}24`,
                },
              ]}>
              <Text style={[styles.phaseCountText, { color: '#FFFFFF' }]}>
                {phaseSecondsLeft}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Instrução Guiada da Fase Atual */}
        <Animated.View style={[styles.instructionBlock, { opacity: textOpacity }]}>
          <Text style={[styles.phaseTitle, { color: accent }]}>
            {currentPhase.label}...
          </Text>
          <Text style={styles.phaseGuidance}>{currentPhase.guidance}</Text>
        </Animated.View>

        {/* Indicador Minimalista da Cadência 4 - 7 - 8 */}
        <View style={styles.cadenceRow}>
          {BREATH_PHASES.map((phase, idx) => {
            const isActive = idx === phaseIndex;
            return (
              <View
                key={phase.key}
                style={[
                  styles.cadenceChip,
                  isActive
                    ? {
                        backgroundColor: `${phase.accentColor}24`,
                        borderColor: phase.accentColor,
                      }
                    : styles.cadenceChipInactive,
                ]}>
                <Text
                  style={[
                    styles.cadenceChipText,
                    { color: isActive ? phase.accentColor : 'rgba(248, 250, 252, 0.5)' },
                  ]}>
                  {phase.durationSec}s {phase.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Controles Inferiores Serenos */}
        <View style={styles.footerControls}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setIsBreathingActive((prev) => !prev);
            }}
            style={[
              styles.primaryActionBtn,
              { backgroundColor: isBreathingActive ? 'rgba(255, 255, 255, 0.12)' : accent },
              isBreathingActive && { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.22)' },
            ]}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={isBreathingActive ? 'Pausar guia de respiração' : 'Retomar guia de respiração'}>
            <Ionicons
              name={isBreathingActive ? 'pause' : 'play'}
              size={IconSize.md}
              color={isBreathingActive ? '#F8FAFC' : getContrastTextColor(accent)}
            />
            <Text
              style={[
                styles.primaryActionText,
                { color: isBreathingActive ? '#F8FAFC' : getContrastTextColor(accent) },
              ]}>
              {isBreathingActive ? 'Pausar Respiração' : 'Retomar Respiração'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('selection');
              onClose();
            }}
            style={styles.secondaryActionBtn}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Voltar para o cronômetro Pomodoro">
            <Text style={styles.secondaryActionText}>Voltar ao cronômetro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SpacingTokens.lg,
    paddingTop: SpacingTokens.md,
    paddingBottom: SpacingTokens.lg,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SpacingTokens.sm,
  },
  topLeft: {
    flex: 1,
    gap: SpacingTokens.xs,
  },
  badgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  breakContextText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.58)',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  iconBtn: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  clockSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ComponentHeightTokens.chip,
  },
  subtleClockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  subtleClockText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.72)',
  },
  clockHiddenText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.45)',
    fontStyle: 'italic',
  },
  orbStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
  },
  outerGlow: {
    position: 'absolute',
  },
  midRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  coreOrb: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  coreInnerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseCountText: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  instructionBlock: {
    alignItems: 'center',
    gap: SpacingTokens.xs,
    marginBottom: SpacingTokens.md,
  },
  phaseTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  phaseGuidance: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.76)',
    textAlign: 'center',
  },
  cadenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    marginBottom: SpacingTokens.lg,
  },
  cadenceChip: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.pill,
    borderWidth: 1,
  },
  cadenceChipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cadenceChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerControls: {
    alignItems: 'center',
    gap: SpacingTokens.sm,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  primaryActionBtn: {
    width: '100%',
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    minHeight: ComponentHeightTokens.buttonCompact,
    paddingHorizontal: SpacingTokens.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.62)',
  },
});
