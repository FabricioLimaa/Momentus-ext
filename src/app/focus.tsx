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
          <View style={[styles.outerCircle, { borderColor: `${theme.primary}50`, shadowColor: theme.primary }]}>
            <View style={[styles.innerCircle, { backgroundColor: theme.surface }]}>
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

        {/* Modal de Configurações de Foco */}
        <Modal
          visible={showSettingsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettingsModal(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Configurações de Foco</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Ajuste a duração dos ciclos de produtividade
                </Text>

                {/* Duração do Foco */}
                <View style={styles.settingBlock}>
                  <View style={styles.settingHeaderRow}>
                    <Text style={[styles.settingName, { color: theme.textPrimary }]}>Duração do Foco</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                        onPress={() => setTempFocus((prev) => Math.max(5, prev - 5))}>
                        <Ionicons name="remove" size={14} color={theme.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.settingValueText, { color: theme.primary }]}>{tempFocus} min</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                        onPress={() => setTempFocus((prev) => Math.min(120, prev + 5))}>
                        <Ionicons name="add" size={14} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[15, 20, 25, 30, 45, 50, 60, 90].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
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

                {/* Pausa Curta */}
                <View style={styles.settingBlock}>
                  <View style={styles.settingHeaderRow}>
                    <Text style={[styles.settingName, { color: theme.textPrimary }]}>Pausa Curta</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                        onPress={() => setTempShort((prev) => Math.max(1, prev - 1))}>
                        <Ionicons name="remove" size={14} color={theme.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.settingValueText, { color: theme.primary }]}>{tempShort} min</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                        onPress={() => setTempShort((prev) => Math.min(30, prev + 1))}>
                        <Ionicons name="add" size={14} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[3, 5, 8, 10, 15].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
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

                {/* Pausa Longa */}
                <View style={styles.settingBlock}>
                  <View style={styles.settingHeaderRow}>
                    <Text style={[styles.settingName, { color: theme.textPrimary }]}>Pausa Longa</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                        onPress={() => setTempLong((prev) => Math.max(5, prev - 5))}>
                        <Ionicons name="remove" size={14} color={theme.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.settingValueText, { color: theme.primary }]}>{tempLong} min</Text>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                        onPress={() => setTempLong((prev) => Math.min(60, prev + 5))}>
                        <Ionicons name="add" size={14} color={theme.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[10, 15, 20, 25, 30, 45].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
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

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowSettingsModal(false)}>
                    <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveSettings}>
                    <Text style={[styles.modalSaveText, { color: getContrastTextColor(theme.primary) }]}>
                      Salvar
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
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
    backgroundColor: MomentusColors.navySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
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
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 26,
    shadowColor: MomentusColors.emeraldNeon,
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
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    marginTop: 2,
    marginBottom: 20,
  },
  settingBlock: {
    marginBottom: 18,
  },
  settingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCancelText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  modalSaveText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
