import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getAppKv, setAppKv } from '@/database/momentusDb';
import { soundManager } from '@/util/soundManager';

type FocusMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
type FocusSettingsTab = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export default function FocusScreen() {
  const { addFocusMinutes, userProfile, theme, showCelebration, triggerHaptic } = useMomentus();

  // Configuração de durações (em minutos)
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);

  const [mode, setMode] = useState<FocusMode>('FOCUS');
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [xpGained, setXpGained] = useState(0);

  // Tempo restante em segundos
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);

  // Carrega durações salvas do SQLite
  useEffect(() => {
    getAppKv<{ focus: number; short: number; long: number }>('focus_durations').then((saved) => {
      if (saved) {
        const f = saved.focus || 25;
        const s = saved.short || 5;
        const l = saved.long || 15;
        setFocusDurationMinutes(f);
        setShortBreakMinutes(s);
        setLongBreakMinutes(l);
        setTimeLeft(f * 60);
        setTotalSeconds(f * 60);
      }
    });
  }, []);

  // Diálogo de configurações no estilo TimePickerModal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<FocusSettingsTab>('FOCUS');
  const [tempFocus, setTempFocus] = useState(25);
  const [tempShort, setTempShort] = useState(5);
  const [tempLong, setTempLong] = useState(15);

  const timerRef = useRef<any>(null);

  const getDurationForMode = useCallback(
    (targetMode: FocusMode, f = focusDurationMinutes, s = shortBreakMinutes, l = longBreakMinutes) => {
      switch (targetMode) {
        case 'FOCUS':
          return f * 60;
        case 'SHORT_BREAK':
          return s * 60;
        case 'LONG_BREAK':
          return l * 60;
      }
    },
    [focusDurationMinutes, shortBreakMinutes, longBreakMinutes]
  );

  const switchMode = useCallback(
    (newMode: FocusMode) => {
      if (isRunning) {
        clearInterval(timerRef.current);
        setIsRunning(false);
      }
      setMode(newMode);
      const secs = getDurationForMode(newMode);
      setTimeLeft(secs);
      setTotalSeconds(secs);
      try {
        Haptics.selectionAsync();
      } catch {
        // Haptics fallback
      }
    },
    [getDurationForMode, isRunning]
  );

  const onTimerFinished = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics fallback
    }

    if (mode === 'FOCUS') {
      const nextSessions = completedSessions + 1;
      const sessionBonus = 10;
      const timeBonus = Math.floor(focusDurationMinutes / 2);
      const totalReward = sessionBonus + timeBonus;
      setCompletedSessions(nextSessions);
      setXpGained((prev) => prev + totalReward);
      addFocusMinutes(focusDurationMinutes);

      showCelebration(
        'Sessão Concluída! 🎯',
        `Parabéns! Você completou ${focusDurationMinutes} min de foco e ganhou +${totalReward} XP (+${sessionBonus} sessão +${timeBonus} tempo).`,
        totalReward
      );

      // Auto-switch: a cada 4 sessões -> Pausa Longa
      if (nextSessions % 4 === 0) {
        switchMode('LONG_BREAK');
      } else {
        switchMode('SHORT_BREAK');
      }
    } else {
      Alert.alert('Pausa Finalizada! ⚡', 'Hora de retomar o foco total.');
      switchMode('FOCUS');
    }
  }, [
    mode,
    completedSessions,
    focusDurationMinutes,
    addFocusMinutes,
    switchMode,
    showCelebration,
  ]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            onTimerFinished();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, onTimerFinished]);

  const toggleTimer = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    const secs = getDurationForMode(mode);
    setTimeLeft(secs);
    setTotalSeconds(secs);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSaveSettings = () => {
    setFocusDurationMinutes(tempFocus);
    setShortBreakMinutes(tempShort);
    setLongBreakMinutes(tempLong);
    setShowSettingsModal(false);

    // Persiste no SQLite
    setAppKv('focus_durations', { focus: tempFocus, short: tempShort, long: tempLong }).catch(() => {});

    const secs = getDurationForMode(mode, tempFocus, tempShort, tempLong);
    setTimeLeft(secs);
    setTotalSeconds(secs);
    setIsRunning(false);

    triggerHaptic('success');
    soundManager.playSuccessSound();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const modeLabel = (() => {
    switch (mode) {
      case 'FOCUS':
        return 'Hora de concentrar';
      case 'SHORT_BREAK':
        return 'Pausa curta';
      case 'LONG_BREAK':
        return 'Pausa longa';
    }
  })();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Modo Foco</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Técnica Pomodoro com ganho contínuo de XP
          </Text>
        </View>

        {/* Tab Switcher: Foco / Pausa Curta / Pausa Longa */}
        <View
          style={[
            styles.modeTabsRow,
            { backgroundColor: theme.surface, borderColor: theme.outline },
          ]}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'FOCUS' && { backgroundColor: theme.primary },
            ]}
            onPress={() => switchMode('FOCUS')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'FOCUS' ? getContrastTextColor(theme.primary) : theme.textSecondary },
                mode === 'FOCUS' && { fontWeight: '800' },
              ]}>
              Foco ({focusDurationMinutes}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'SHORT_BREAK' && { backgroundColor: theme.primary },
            ]}
            onPress={() => switchMode('SHORT_BREAK')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'SHORT_BREAK' ? getContrastTextColor(theme.primary) : theme.textSecondary },
                mode === 'SHORT_BREAK' && { fontWeight: '800' },
              ]}>
              Curta ({shortBreakMinutes}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'LONG_BREAK' && { backgroundColor: theme.primary },
            ]}
            onPress={() => switchMode('LONG_BREAK')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'LONG_BREAK' ? getContrastTextColor(theme.primary) : theme.textSecondary },
                mode === 'LONG_BREAK' && { fontWeight: '800' },
              ]}>
              Longa ({longBreakMinutes}m)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Big Circular Timer Display */}
        <View style={styles.timerCenter}>
          <View
            style={[
              styles.outerCircle,
              {
                borderColor: `${theme.primary}50`,
                shadowColor: theme.primary,
                backgroundColor: theme.isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)',
              },
            ]}>
            <View style={[styles.innerCircle, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <Text style={[styles.modeStatusLabel, { color: theme.textSecondary }]}>{modeLabel}</Text>
              <Text style={[styles.timerDisplay, { color: theme.textPrimary }]}>{timeFormatted}</Text>
              <View
                style={[
                  styles.statusBadge,
                  isRunning
                    ? { backgroundColor: `${theme.primary}20` }
                    : { backgroundColor: theme.isDark ? '#283548' : '#F1F5F9' },
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isRunning ? theme.primary : theme.textSecondary },
                  ]}>
                  {isRunning ? 'EM ANDAMENTO' : `${progressPercent}% PRONTO`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={resetTimer}
            style={[
              styles.controlIconBtn,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}
            activeOpacity={0.7}>
            <Ionicons name="refresh" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTimer}
            style={[
              styles.playBtn,
              { backgroundColor: isRunning ? MomentusColors.dangerRed : theme.primary },
            ]}
            activeOpacity={0.85}>
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={32}
              color={isRunning ? '#FFFFFF' : getContrastTextColor(theme.primary)}
            />
            <Text
              style={[
                styles.playBtnText,
                { color: isRunning ? '#FFFFFF' : getContrastTextColor(theme.primary) },
              ]}>
              {isRunning ? 'PAUSAR' : 'FOCO'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setTempFocus(focusDurationMinutes);
              setTempShort(shortBreakMinutes);
              setTempLong(longBreakMinutes);
              setActiveSettingsTab('FOCUS');
              setShowSettingsModal(true);
            }}
            style={[
              styles.controlIconBtn,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}
            activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sessão Stats Card */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.surface, borderColor: theme.outline },
          ]}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-done-circle" size={20} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{completedSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sessões Concluídas</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.outline }]} />

          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color={MomentusColors.gold} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>+{xpGained} XP</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>XP Ganho na Sessão</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.outline }]} />

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color={theme.primary} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{userProfile.focusMinutesToday} min</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Foco Hoje</Text>
          </View>
        </View>

        {/* Modal de Configurações de Foco (Estilo idêntico ao TimePickerModal) */}
        <Modal
          visible={showSettingsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettingsModal(false)}>
          <View style={styles.pickerOverlay}>
            <View
              style={[
                styles.pickerDialogContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              {/* Cabeçalho */}
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHeaderLeft}>
                  <View style={[styles.pickerHeaderIconBg, { backgroundColor: `${theme.primary}20` }]}>
                    <Ionicons name="timer" size={18} color={theme.primary} />
                  </View>
                  <View>
                    <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                      Configurar Ciclos
                    </Text>
                    <Text style={[styles.pickerSubtitle, { color: theme.textSecondary }]}>
                      Técnica Pomodoro
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowSettingsModal(false)}
                  style={[styles.pickerCloseBtn, { backgroundColor: theme.surfaceElevated }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Seletor de Abas de Ciclo (Segmented Control) */}
              <View
                style={[
                  styles.pickerTabsRow,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                ]}>
                <TouchableOpacity
                  style={[
                    styles.pickerTabItem,
                    activeSettingsTab === 'FOCUS' && [
                      styles.pickerTabItemActive,
                      { backgroundColor: theme.primary },
                    ],
                  ]}
                  onPress={() => {
                    setActiveSettingsTab('FOCUS');
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="flame"
                    size={14}
                    color={
                      activeSettingsTab === 'FOCUS'
                        ? getContrastTextColor(theme.primary)
                        : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.pickerTabItemText,
                      {
                        color:
                          activeSettingsTab === 'FOCUS'
                            ? getContrastTextColor(theme.primary)
                            : theme.textSecondary,
                      },
                      activeSettingsTab === 'FOCUS' && styles.pickerTabItemTextActive,
                    ]}>
                    Foco
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pickerTabItem,
                    activeSettingsTab === 'SHORT_BREAK' && [
                      styles.pickerTabItemActive,
                      { backgroundColor: theme.primary },
                    ],
                  ]}
                  onPress={() => {
                    setActiveSettingsTab('SHORT_BREAK');
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="cafe"
                    size={14}
                    color={
                      activeSettingsTab === 'SHORT_BREAK'
                        ? getContrastTextColor(theme.primary)
                        : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.pickerTabItemText,
                      {
                        color:
                          activeSettingsTab === 'SHORT_BREAK'
                            ? getContrastTextColor(theme.primary)
                            : theme.textSecondary,
                      },
                      activeSettingsTab === 'SHORT_BREAK' && styles.pickerTabItemTextActive,
                    ]}>
                    Pausa Curta
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pickerTabItem,
                    activeSettingsTab === 'LONG_BREAK' && [
                      styles.pickerTabItemActive,
                      { backgroundColor: theme.primary },
                    ],
                  ]}
                  onPress={() => {
                    setActiveSettingsTab('LONG_BREAK');
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="battery-charging"
                    size={14}
                    color={
                      activeSettingsTab === 'LONG_BREAK'
                        ? getContrastTextColor(theme.primary)
                        : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.pickerTabItemText,
                      {
                        color:
                          activeSettingsTab === 'LONG_BREAK'
                            ? getContrastTextColor(theme.primary)
                            : theme.textSecondary,
                      },
                      activeSettingsTab === 'LONG_BREAK' && styles.pickerTabItemTextActive,
                    ]}>
                    Pausa Longa
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Display Digital Minimalista (Idêntico ao TimePickerModal) */}
              <View
                style={[
                  styles.pickerDisplayCard,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                ]}>
                <View style={styles.pickerDigitalRow}>
                  <View
                    style={[
                      styles.pickerDigitalPill,
                      {
                        borderColor: `${theme.primary}50`,
                        backgroundColor: `${theme.primary}15`,
                      },
                    ]}>
                    <Text style={[styles.pickerDigitalNumber, { color: theme.textPrimary }]}>
                      {String(
                        activeSettingsTab === 'FOCUS'
                          ? tempFocus
                          : activeSettingsTab === 'SHORT_BREAK'
                            ? tempShort
                            : tempLong
                      ).padStart(2, '0')}
                    </Text>
                    <Text style={[styles.pickerDigitalTag, { color: theme.primary }]}>MINUTOS</Text>
                  </View>
                </View>

                {/* Badge de Status / Propósito */}
                <View style={[styles.pickerPeriodBadge, { backgroundColor: `${theme.primary}15` }]}>
                  <Text style={[styles.pickerPeriodText, { color: theme.primary }]}>
                    {activeSettingsTab === 'FOCUS'
                      ? 'Produtividade Máxima 🍅'
                      : activeSettingsTab === 'SHORT_BREAK'
                        ? 'Descanso Rápido ☕'
                        : 'Recuperação Profunda 🔋'}
                  </Text>
                </View>
              </View>

              {/* Stepper de Ajuste Fino */}
              <View style={[styles.pickerStepperCard, { borderColor: theme.outline }]}>
                <TouchableOpacity
                  style={[
                    styles.pickerStepperBtn,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}
                  onPress={() => {
                    if (activeSettingsTab === 'FOCUS') {
                      setTempFocus((prev) => Math.max(5, prev - 5));
                    } else if (activeSettingsTab === 'SHORT_BREAK') {
                      setTempShort((prev) => Math.max(1, prev - 1));
                    } else {
                      setTempLong((prev) => Math.max(5, prev - 5));
                    }
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name="remove" size={18} color={theme.textPrimary} />
                </TouchableOpacity>

                <View style={styles.pickerStepperLabelCol}>
                  <Text style={[styles.pickerStepperLabel, { color: theme.textSecondary }]}>
                    {activeSettingsTab === 'SHORT_BREAK' ? 'Ajuste fino ±1 min' : 'Ajuste fino ±5 min'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.pickerStepperBtn,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}
                  onPress={() => {
                    if (activeSettingsTab === 'FOCUS') {
                      setTempFocus((prev) => Math.min(120, prev + 5));
                    } else if (activeSettingsTab === 'SHORT_BREAK') {
                      setTempShort((prev) => Math.min(30, prev + 1));
                    } else {
                      setTempLong((prev) => Math.min(60, prev + 5));
                    }
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Chips de Atalho Rápido */}
              <View style={styles.pickerQuickChipsRow}>
                {(activeSettingsTab === 'FOCUS'
                  ? [15, 20, 25, 30, 45, 60]
                  : activeSettingsTab === 'SHORT_BREAK'
                    ? [3, 5, 8, 10, 15]
                    : [10, 15, 20, 25, 30]
                ).map((val) => {
                  const isCurrent =
                    (activeSettingsTab === 'FOCUS' && tempFocus === val) ||
                    (activeSettingsTab === 'SHORT_BREAK' && tempShort === val) ||
                    (activeSettingsTab === 'LONG_BREAK' && tempLong === val);

                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.pickerQuickChip,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                        isCurrent && {
                          backgroundColor: `${theme.primary}25`,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => {
                        if (activeSettingsTab === 'FOCUS') setTempFocus(val);
                        else if (activeSettingsTab === 'SHORT_BREAK') setTempShort(val);
                        else setTempLong(val);
                        triggerHaptic('impact');
                      }}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.pickerQuickChipText,
                          { color: theme.textSecondary },
                          isCurrent && { color: theme.primary, fontWeight: '800' },
                        ]}>
                        {val}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Resumo da Sequência Pomodoro */}
              <View style={[styles.cycleSummaryCard, { backgroundColor: theme.surfaceElevated }]}>
                <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.cycleSummaryText, { color: theme.textSecondary }]}>
                  Ciclo: {tempFocus}m foco • {tempShort}m curta • {tempLong}m longa
                </Text>
              </View>

              {/* Botões Inferiores */}
              <View style={styles.pickerActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.pickerCancelBtn,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}
                  onPress={() => setShowSettingsModal(false)}
                  activeOpacity={0.7}>
                  <Text style={[styles.pickerCancelBtnText, { color: theme.textSecondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerSaveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveSettings}
                  activeOpacity={0.85}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={getContrastTextColor(theme.primary)}
                  />
                  <Text
                    style={[
                      styles.pickerSaveBtnText,
                      { color: getContrastTextColor(theme.primary) },
                    ]}>
                    Salvar Ciclos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  header: {
    paddingTop: 16,
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
  modeTabsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginTop: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: MomentusColors.textSecondary,
  },
  modeTabTextActive: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '800',
  },
  timerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  outerCircle: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  innerCircle: {
    width: 228,
    height: 228,
    borderRadius: 114,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modeStatusLabel: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  timerDisplay: {
    color: MomentusColors.textPrimary,
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusBadgeRunning: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  statusBadgeIdle: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  statusBadgeText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 26,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  pauseBtn: {
    backgroundColor: MomentusColors.gold,
  },
  playBtnText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
  },
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: MomentusColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: MomentusColors.navyOutline,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerDialogContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerHeaderIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  pickerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  pickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTabsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  pickerTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickerTabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerTabItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerTabItemTextActive: {
    fontWeight: '800',
  },
  pickerDisplayCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerDigitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDigitalPill: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 110,
  },
  pickerDigitalNumber: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  pickerDigitalTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  pickerPeriodBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pickerPeriodText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pickerStepperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 14,
  },
  pickerStepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerStepperLabelCol: {
    alignItems: 'center',
  },
  pickerStepperLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pickerQuickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
  },
  pickerQuickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerQuickChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cycleSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  cycleSummaryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerSaveBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
