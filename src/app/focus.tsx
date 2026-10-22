import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getAppKv, setAppKv } from '@/database/momentusDb';

type FocusMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export default function FocusScreen() {
  const { addFocusMinutes, userProfile, theme, showCelebration } = useMomentus();

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

  // Diálogo de configurações
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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

        {/* Modal de Configurações de Foco (Padrão Bottom Sheet do NewHabitModal) */}
        <Modal
          visible={showSettingsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSettingsModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetOverlay}>
            <View
              style={[
                styles.sheetContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Configurações de Foco</Text>
                  <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
                    Ajuste os ciclos da Técnica Pomodoro
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.sheetCloseBtn}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {/* 1. Duração do Foco */}
                <View style={[styles.settingCard, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={styles.settingHeaderRow}>
                    <View style={styles.settingTitleCol}>
                      <View style={styles.settingIconRow}>
                        <Ionicons name="flame" size={16} color={theme.primary} />
                        <Text style={[styles.settingName, { color: theme.textPrimary }]}>Duração do Foco</Text>
                      </View>
                      <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Ciclo de produtividade contínua</Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => setTempFocus((prev) => Math.max(5, prev - 5))}>
                        <Ionicons name="remove" size={16} color={theme.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.settingValueText, { color: theme.primary }]}>{tempFocus} min</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => setTempFocus((prev) => Math.min(120, prev + 5))}>
                        <Ionicons name="add" size={16} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[15, 20, 25, 30, 45, 50, 60, 90].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          { backgroundColor: theme.surface, borderColor: theme.outline },
                          tempFocus === v && { backgroundColor: `${theme.primary}25`, borderColor: theme.primary },
                        ]}
                        onPress={() => setTempFocus(v)}>
                        <Text
                          style={[
                            styles.presetPillText,
                            { color: theme.textSecondary },
                            tempFocus === v && { color: theme.primary, fontWeight: '800' },
                          ]}>
                          {v}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 2. Pausa Curta */}
                <View style={[styles.settingCard, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={styles.settingHeaderRow}>
                    <View style={styles.settingTitleCol}>
                      <View style={styles.settingIconRow}>
                        <Ionicons name="cafe" size={16} color={MomentusColors.cyan} />
                        <Text style={[styles.settingName, { color: theme.textPrimary }]}>Pausa Curta</Text>
                      </View>
                      <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Descanso entre os blocos</Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => setTempShort((prev) => Math.max(1, prev - 1))}>
                        <Ionicons name="remove" size={16} color={theme.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.settingValueText, { color: theme.primary }]}>{tempShort} min</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => setTempShort((prev) => Math.min(30, prev + 1))}>
                        <Ionicons name="add" size={16} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[3, 5, 8, 10, 15].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          { backgroundColor: theme.surface, borderColor: theme.outline },
                          tempShort === v && { backgroundColor: `${theme.primary}25`, borderColor: theme.primary },
                        ]}
                        onPress={() => setTempShort(v)}>
                        <Text
                          style={[
                            styles.presetPillText,
                            { color: theme.textSecondary },
                            tempShort === v && { color: theme.primary, fontWeight: '800' },
                          ]}>
                          {v}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 3. Pausa Longa */}
                <View style={[styles.settingCard, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={styles.settingHeaderRow}>
                    <View style={styles.settingTitleCol}>
                      <View style={styles.settingIconRow}>
                        <Ionicons name="battery-charging" size={16} color={MomentusColors.gold} />
                        <Text style={[styles.settingName, { color: theme.textPrimary }]}>Pausa Longa</Text>
                      </View>
                      <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Recuperação a cada 4 ciclos</Text>
                    </View>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => setTempLong((prev) => Math.max(5, prev - 5))}>
                        <Ionicons name="remove" size={16} color={theme.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.settingValueText, { color: theme.primary }]}>{tempLong} min</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => setTempLong((prev) => Math.min(60, prev + 5))}>
                        <Ionicons name="add" size={16} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[10, 15, 20, 25, 30, 45].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          { backgroundColor: theme.surface, borderColor: theme.outline },
                          tempLong === v && { backgroundColor: `${theme.primary}25`, borderColor: theme.primary },
                        ]}
                        onPress={() => setTempLong(v)}>
                        <Text
                          style={[
                            styles.presetPillText,
                            { color: theme.textSecondary },
                            tempLong === v && { color: theme.primary, fontWeight: '800' },
                          ]}>
                          {v}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Footer com Cancelar e Salvar Alterações (Igual NewHabitModal) */}
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  style={[
                    styles.sheetCancelBtn,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}
                  onPress={() => setShowSettingsModal(false)}>
                  <Text style={[styles.sheetCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sheetSaveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveSettings}>
                  <Text style={[styles.sheetSaveText, { color: getContrastTextColor(theme.primary) }]}>
                    Salvar Alterações
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  sheetBody: {
    marginBottom: 14,
  },
  settingCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  settingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingTitleCol: {
    flex: 1,
  },
  settingIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingValueText: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 54,
    textAlign: 'center',
  },
  pillSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetSaveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  sheetSaveText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
