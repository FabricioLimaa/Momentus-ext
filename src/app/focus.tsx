import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

type FocusMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export default function FocusScreen() {
  const { addFocusMinutes, userProfile } = useMomentus();

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

  // Diálogo de configurações
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempFocus, setTempFocus] = useState(25);
  const [tempShort, setTempShort] = useState(5);
  const [tempLong, setTempLong] = useState(15);

  const timerRef = useRef<any>(null);

  const getDurationForMode = (targetMode: FocusMode, f = focusDurationMinutes, s = shortBreakMinutes, l = longBreakMinutes) => {
    switch (targetMode) {
      case 'FOCUS':
        return f * 60;
      case 'SHORT_BREAK':
        return s * 60;
      case 'LONG_BREAK':
        return l * 60;
    }
  };

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
      const xpReward = 10;
      setCompletedSessions(nextSessions);
      setXpGained((prev) => prev + xpReward);
      addFocusMinutes(focusDurationMinutes);

      Alert.alert(
        'Sessão Concluída! 🎯',
        `Parabéns! Você completou sua sessão de foco e ganhou +${xpReward} XP.`
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
    } catch (_) {}
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
    } catch (_) {}
  };

  const handleSaveSettings = () => {
    setFocusDurationMinutes(tempFocus);
    setShortBreakMinutes(tempShort);
    setLongBreakMinutes(tempLong);
    setShowSettingsModal(false);

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Modo Foco</Text>
          <Text style={styles.subtitle}>Técnica Pomodoro com ganho contínuo de XP</Text>
        </View>

        {/* Tab Switcher: Foco / Pausa Curta / Pausa Longa */}
        <View style={styles.modeTabsRow}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'FOCUS' && styles.modeTabActive]}
            onPress={() => switchMode('FOCUS')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                mode === 'FOCUS' && styles.modeTabTextActive,
              ]}>
              Foco ({focusDurationMinutes}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'SHORT_BREAK' && styles.modeTabActive]}
            onPress={() => switchMode('SHORT_BREAK')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                mode === 'SHORT_BREAK' && styles.modeTabTextActive,
              ]}>
              Curta ({shortBreakMinutes}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'LONG_BREAK' && styles.modeTabActive]}
            onPress={() => switchMode('LONG_BREAK')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                mode === 'LONG_BREAK' && styles.modeTabTextActive,
              ]}>
              Longa ({longBreakMinutes}m)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Big Circular Timer Display */}
        <View style={styles.timerCenter}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Text style={styles.modeStatusLabel}>{modeLabel}</Text>
              <Text style={styles.timerDisplay}>{timeFormatted}</Text>
              <View
                style={[
                  styles.statusBadge,
                  isRunning ? styles.statusBadgeRunning : styles.statusBadgeIdle,
                ]}>
                <Text style={styles.statusBadgeText}>
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
            style={styles.controlIconBtn}
            activeOpacity={0.7}>
            <Ionicons name="refresh" size={24} color={MomentusColors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTimer}
            style={[styles.playBtn, isRunning && styles.pauseBtn]}
            activeOpacity={0.85}>
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={32}
              color="#0F172A"
            />
            <Text style={styles.playBtnText}>{isRunning ? 'PAUSAR' : 'FOCO'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setTempFocus(focusDurationMinutes);
              setTempShort(shortBreakMinutes);
              setTempLong(longBreakMinutes);
              setShowSettingsModal(true);
            }}
            style={styles.controlIconBtn}
            activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color={MomentusColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sessão Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-done-circle" size={20} color={MomentusColors.emeraldNeon} />
            <Text style={styles.statValue}>{completedSessions}</Text>
            <Text style={styles.statLabel}>Sessões Concluídas</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color={MomentusColors.gold} />
            <Text style={styles.statValue}>+{xpGained} XP</Text>
            <Text style={styles.statLabel}>XP Ganho na Sessão</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color={MomentusColors.emeraldNeon} />
            <Text style={styles.statValue}>{userProfile.focusMinutesToday} min</Text>
            <Text style={styles.statLabel}>Foco Hoje</Text>
          </View>
        </View>

        {/* Modal de Configurações de Foco */}
        <Modal
          visible={showSettingsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettingsModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Configurações de Foco</Text>
                <Text style={styles.modalSubtitle}>
                  Ajuste a duração dos ciclos de produtividade
                </Text>

                {/* Duração do Foco */}
                <View style={styles.settingBlock}>
                  <View style={styles.settingHeaderRow}>
                    <Text style={styles.settingName}>Duração do Foco</Text>
                    <Text style={styles.settingValueText}>{tempFocus} min</Text>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[15, 20, 25, 30, 45, 50, 60].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          tempFocus === v && styles.presetPillActive,
                        ]}
                        onPress={() => setTempFocus(v)}>
                        <Text
                          style={[
                            styles.presetPillText,
                            tempFocus === v && styles.presetPillTextActive,
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
                    <Text style={styles.settingName}>Pausa Curta</Text>
                    <Text style={styles.settingValueText}>{tempShort} min</Text>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[3, 5, 8, 10, 15].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          tempShort === v && styles.presetPillActive,
                        ]}
                        onPress={() => setTempShort(v)}>
                        <Text
                          style={[
                            styles.presetPillText,
                            tempShort === v && styles.presetPillTextActive,
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
                    <Text style={styles.settingName}>Pausa Longa</Text>
                    <Text style={styles.settingValueText}>{tempLong} min</Text>
                  </View>
                  <View style={styles.pillSelectorRow}>
                    {[10, 15, 20, 25, 30].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[
                          styles.presetPill,
                          tempLong === v && styles.presetPillActive,
                        ]}
                        onPress={() => setTempLong(v)}>
                        <Text
                          style={[
                            styles.presetPillText,
                            tempLong === v && styles.presetPillTextActive,
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
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleSaveSettings}>
                    <Text style={styles.modalSaveText}>Salvar</Text>
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
    borderColor: 'rgba(52, 211, 153, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MomentusColors.emeraldNeon,
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
    marginBottom: 8,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  settingValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: MomentusColors.emeraldNeon,
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
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
  },
  presetPillActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderColor: MomentusColors.emeraldNeon,
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: MomentusColors.textSecondary,
  },
  presetPillTextActive: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '800',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCancelText: {
    color: MomentusColors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  modalSaveText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
});
