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
  ScrollView,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString } from '@/constants/initialData';
import { getAppKv, setAppKv } from '@/database/momentusDb';
import { soundManager } from '@/util/soundManager';
import {
  scheduleFocusNotification,
  cancelFocusNotification,
} from '@/services/notificationService';

type FocusMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
type FocusSettingsTab = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export default function FocusScreen() {
  const {
    habits,
    categories,
    toggleHabit,
    addFocusMinutes,
    userProfile,
    theme,
    showCelebration,
    triggerHaptic,
  } = useMomentus();

  // Configuração de durações (em minutos)
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);

  const [mode, setMode] = useState<FocusMode>('FOCUS');
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [xpGained, setXpGained] = useState(0);

  // Vínculo com Hábito do Dia
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showHabitPickerModal, setShowHabitPickerModal] = useState(false);

  // Som de foco suave / Tique-taque
  const [tickingEnabled, setTickingEnabled] = useState(false);

  // Tempo restante em segundos
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);

  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number | null>(null);
  const onTimerFinishedRef = useRef<() => void>(() => {});
  const timeLeftRef = useRef(timeLeft);
  const notificationIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number>(-1);

  // Carrega configurações salvas do SQLite
  useEffect(() => {
    getAppKv<{ focus: number; short: number; long: number }>('focus_durations').then((saved) => {
      if (saved) {
        const f = Number(saved.focus) || 25;
        const s = Number(saved.short) || 5;
        const l = Number(saved.long) || 15;
        setFocusDurationMinutes(f);
        setShortBreakMinutes(s);
        setLongBreakMinutes(l);
        setTimeLeft(f * 60);
        setTotalSeconds(f * 60);
      }
    });

    getAppKv<boolean>('focus_ticking_enabled').then((saved) => {
      if (typeof saved === 'boolean') {
        setTickingEnabled(saved);
      }
    });

    // Restaura sessão de foco ativa caso o usuário tenha trocado de aba ou recarregado
    getAppKv<{
      endTime: number;
      mode: FocusMode;
      selectedHabitId?: string | null;
      totalSeconds: number;
    }>('active_focus_timer').then((active) => {
      if (active && active.endTime) {
        const now = Date.now();
        const remainingMs = active.endTime - now;
        const remainingSec = Math.ceil(remainingMs / 1000);
        if (remainingSec > 0) {
          setMode(active.mode);
          if (active.selectedHabitId) setSelectedHabitId(active.selectedHabitId);
          setTotalSeconds(active.totalSeconds);
          setTimeLeft(remainingSec);
          endTimeRef.current = active.endTime;
          setIsRunning(true);
        } else {
          setAppKv('active_focus_timer', null).catch(() => {});
        }
      }
    });
  }, []);

  // Diálogo de configurações no estilo TimePickerModal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<FocusSettingsTab>('FOCUS');
  const [tempFocus, setTempFocus] = useState(25);
  const [tempShort, setTempShort] = useState(5);
  const [tempLong, setTempLong] = useState(15);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const toggleTicking = () => {
    const next = !tickingEnabled;
    setTickingEnabled(next);
    setAppKv('focus_ticking_enabled', next).catch(() => {});
    triggerHaptic('impact');
    if (next) {
      soundManager.playTickSound();
    }
  };

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

  const getModeColor = useCallback(
    (targetMode: FocusMode) => {
      switch (targetMode) {
        case 'FOCUS':
          return theme.primary;
        case 'SHORT_BREAK':
          return '#06B6D4';
        case 'LONG_BREAK':
          return '#8B5CF6';
      }
    },
    [theme.primary]
  );

  const activeColor = getModeColor(mode);

  const switchMode = useCallback(
    (newMode: FocusMode) => {
      if (timerRef.current) clearInterval(timerRef.current);
      endTimeRef.current = null;
      setIsRunning(false);
      cancelFocusNotification(notificationIdRef.current);
      notificationIdRef.current = null;
      setAppKv('active_focus_timer', null).catch(() => {});
      setMode(newMode);
      const secs = getDurationForMode(newMode);
      setTimeLeft(secs);
      setTotalSeconds(secs);
      triggerHaptic('impact');
    },
    [getDurationForMode, triggerHaptic]
  );

  const onTimerFinished = useCallback(() => {
    triggerHaptic('success');
    soundManager.playAchievementSound();
    cancelFocusNotification(notificationIdRef.current);
    notificationIdRef.current = null;
    setAppKv('active_focus_timer', null).catch(() => {});

    if (mode === 'FOCUS') {
      const nextSessions = completedSessions + 1;
      const sessionBonus = 10;
      const timeBonus = Math.floor(focusDurationMinutes / 2);
      const totalReward = sessionBonus + timeBonus;
      setCompletedSessions(nextSessions);
      setXpGained((prev) => prev + totalReward);
      addFocusMinutes(focusDurationMinutes);

      const linkedHabit = habits.find((h) => h.id === selectedHabitId);
      if (linkedHabit && !linkedHabit.completed) {
        toggleHabit(linkedHabit.id);
      }

      const celebrationSubtitle = linkedHabit
        ? `Parabéns! Você completou ${focusDurationMinutes} min de foco no hábito "${linkedHabit.title}" e ganhou +${totalReward} XP (+${sessionBonus} sessão +${timeBonus} tempo).`
        : `Parabéns! Você completou ${focusDurationMinutes} min de foco e ganhou +${totalReward} XP (+${sessionBonus} sessão +${timeBonus} tempo).`;

      showCelebration(
        'Sessão Concluída! 🎯',
        celebrationSubtitle,
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
    selectedHabitId,
    habits,
    toggleHabit,
    addFocusMinutes,
    switchMode,
    showCelebration,
    triggerHaptic,
  ]);

  // Mantém a referência do callback sempre fresca sem reiniciar o timer
  useEffect(() => {
    onTimerFinishedRef.current = onTimerFinished;
  }, [onTimerFinished]);

  // Ouve alterações no ciclo de vida do app (segundo plano / tela desligada)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isRunning && endTimeRef.current) {
        const now = Date.now();
        const remainingMs = endTimeRef.current - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        setTimeLeft(remainingSec);
        if (remainingSec <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          endTimeRef.current = null;
          setIsRunning(false);
          cancelFocusNotification(notificationIdRef.current);
          notificationIdRef.current = null;
          setAppKv('active_focus_timer', null).catch(() => {});
          onTimerFinishedRef.current();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isRunning]);

  // Temporizador preciso baseado em timestamp absoluto (à prova de re-render e segundo plano)
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + timeLeftRef.current * 1000;
    }

    const tick = () => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const remainingMs = endTimeRef.current - now;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSec);

      // Tique-taque sonoro durante o foco se ativado pelo usuário
      if (tickingEnabled && mode === 'FOCUS' && remainingSec > 0) {
        if (lastTickSecondRef.current !== remainingSec) {
          lastTickSecondRef.current = remainingSec;
          soundManager.playTickSound();
        }
      }

      if (remainingSec <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        endTimeRef.current = null;
        setIsRunning(false);
        cancelFocusNotification(notificationIdRef.current);
        notificationIdRef.current = null;
        setAppKv('active_focus_timer', null).catch(() => {});
        setTimeout(() => {
          onTimerFinishedRef.current();
        }, 50);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, mode, tickingEnabled]);

  const toggleTimer = () => {
    triggerHaptic('impact');
    if (!isRunning) {
      // Inicia a contagem baseada na hora atual + segundos restantes
      const targetEndTime = Date.now() + timeLeft * 1000;
      endTimeRef.current = targetEndTime;
      setIsRunning(true);
      soundManager.playSuccessSound();

      // Agenda notificação local de término no dispositivo
      const linkedHabit = habits.find((h) => h.id === selectedHabitId);
      scheduleFocusNotification(timeLeft, mode, linkedHabit?.title).then((id) => {
        notificationIdRef.current = id || null;
      });

      // Persiste sessão ativa no SQLite
      setAppKv('active_focus_timer', {
        endTime: targetEndTime,
        mode,
        selectedHabitId,
        totalSeconds,
      }).catch(() => {});
    } else {
      // Pausa a contagem preservando o timeLeft atual
      endTimeRef.current = null;
      setIsRunning(false);
      cancelFocusNotification(notificationIdRef.current);
      notificationIdRef.current = null;
      setAppKv('active_focus_timer', null).catch(() => {});
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endTimeRef.current = null;
    setIsRunning(false);
    cancelFocusNotification(notificationIdRef.current);
    notificationIdRef.current = null;
    setAppKv('active_focus_timer', null).catch(() => {});
    const secs = getDurationForMode(mode);
    setTimeLeft(secs);
    setTotalSeconds(secs);
    triggerHaptic('impact');
  };

  const handleSaveSettings = () => {
    setFocusDurationMinutes(tempFocus);
    setShortBreakMinutes(tempShort);
    setLongBreakMinutes(tempLong);
    setShowSettingsModal(false);

    // Persiste no SQLite
    setAppKv('focus_durations', { focus: tempFocus, short: tempShort, long: tempLong }).catch(() => {});

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endTimeRef.current = null;
    setIsRunning(false);

    const secs = getDurationForMode(mode, tempFocus, tempShort, tempLong);
    setTimeLeft(secs);
    setTotalSeconds(secs);

    triggerHaptic('success');
    soundManager.playSuccessSound();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const today = getTodayDateString();
  const todayHabits = habits.filter((h) => h.date === today);
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) || null;
  const selectedCategory = selectedHabit
    ? categories.find((c) => c.id === selectedHabit.categoryId)
    : null;

  const currentCycleInSet = (completedSessions % 4) + 1; // 1, 2, 3, 4
  const estimatedXp = 10 + Math.floor(focusDurationMinutes / 2);

  const modeLabel = (() => {
    switch (mode) {
      case 'FOCUS':
        return 'Hora de concentrar';
      case 'SHORT_BREAK':
        return 'Pausa curta • Respire fundo';
      case 'LONG_BREAK':
        return 'Pausa longa • Recarregue';
    }
  })();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Modo Foco</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Técnica Pomodoro com ganho contínuo de XP
          </Text>
        </View>

        {/* --- ÁREA DESTACADA: Régua dos 4 Ciclos Pomodoro + Badge de XP + Seletor de Hábito --- */}
        <View
          style={[
            styles.pomodoroFlowContainer,
            { backgroundColor: theme.surface, borderColor: theme.outline },
          ]}>
          {/* Topo do Card: Indicador da Rodada & Badge de XP */}
          <View style={styles.cycleHeaderRow}>
            <View style={styles.cycleInfoLeft}>
              <Ionicons name="repeat" size={15} color={activeColor} />
              <Text style={[styles.cycleStatusTitle, { color: theme.textPrimary }]}>
                {mode === 'FOCUS'
                  ? `Rodada Pomodoro: Ciclo ${currentCycleInSet} de 4`
                  : mode === 'SHORT_BREAK'
                  ? `Pausa Curta (${shortBreakMinutes}m)`
                  : `Pausa Longa Restauradora (${longBreakMinutes}m)`}
              </Text>
            </View>

            <View style={styles.cycleHeaderRight}>
              <TouchableOpacity
                style={[
                  styles.tickingToggleBtn,
                  {
                    backgroundColor: tickingEnabled ? `${activeColor}20` : `${theme.textSecondary}15`,
                    borderColor: tickingEnabled ? activeColor : theme.outline,
                  },
                ]}
                onPress={toggleTicking}
                activeOpacity={0.7}
                accessibilityLabel="Alternar som de tique-taque">
                <Ionicons
                  name={tickingEnabled ? 'volume-high' : 'volume-mute'}
                  size={12}
                  color={tickingEnabled ? activeColor : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tickingToggleText,
                    { color: tickingEnabled ? activeColor : theme.textSecondary },
                  ]}>
                  {tickingEnabled ? 'Tique-taque' : 'Mudo'}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.xpBadge,
                  { backgroundColor: `${MomentusColors.gold}20`, borderColor: `${MomentusColors.gold}50` },
                ]}>
                <Ionicons name="flash" size={12} color={MomentusColors.gold} />
                <Text style={[styles.xpBadgeText, { color: MomentusColors.gold }]}>
                  +{estimatedXp} XP
                </Text>
              </View>
            </View>
          </View>

          {/* Régua Visual dos 4 Ciclos da Rodada */}
          <View style={styles.cycleRulerRow}>
            {[1, 2, 3, 4].map((cycleNum) => {
              const isDone = (completedSessions % 4) >= cycleNum;
              const isCurrent = (completedSessions % 4) + 1 === cycleNum && mode === 'FOCUS';
              return (
                <View
                  key={cycleNum}
                  style={[
                    styles.cycleCapsule,
                    {
                      backgroundColor: isDone
                        ? `${activeColor}25`
                        : isCurrent
                        ? `${activeColor}15`
                        : theme.isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                      borderColor: isCurrent
                        ? activeColor
                        : isDone
                        ? `${activeColor}60`
                        : theme.outline,
                    },
                  ]}>
                  {isDone ? (
                    <Ionicons name="checkmark-sharp" size={13} color={activeColor} />
                  ) : isCurrent ? (
                    <Ionicons name="flame" size={13} color={activeColor} />
                  ) : (
                    <Text style={[styles.cycleNumberText, { color: theme.textSecondary }]}>
                      {cycleNum}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.cycleLabelText,
                      {
                        color: isCurrent
                          ? activeColor
                          : isDone
                          ? theme.textPrimary
                          : theme.textSecondary,
                        fontWeight: isCurrent ? '800' : '600',
                      },
                    ]}>
                    {cycleNum === 4 ? 'Ciclo 4 🔋' : `Ciclo ${cycleNum}`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Divisor sutil */}
          <View style={[styles.flowDivider, { backgroundColor: theme.outline }]} />

          {/* Seletor de Hábito Vinculado */}
          <TouchableOpacity
            style={[
              styles.habitSelectorCard,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: selectedHabit
                  ? `${selectedCategory?.color || activeColor}60`
                  : theme.outline,
              },
            ]}
            onPress={() => setShowHabitPickerModal(true)}
            activeOpacity={0.75}>
            <View style={styles.habitSelectorLeft}>
              <View
                style={[
                  styles.habitSelectorIconCircle,
                  {
                    backgroundColor: selectedHabit
                      ? `${selectedCategory?.color || activeColor}22`
                      : `${theme.textSecondary}15`,
                  },
                ]}>
                <Ionicons
                  name={selectedHabit ? 'flag' : 'radio-button-off'}
                  size={16}
                  color={
                    selectedHabit
                      ? selectedCategory?.color || activeColor
                      : theme.textSecondary
                  }
                />
              </View>
              <View style={styles.habitSelectorTextCol}>
                <Text style={[styles.habitSelectorOverline, { color: theme.textSecondary }]}>
                  {selectedHabit ? 'HÁBITO VINCULADO AO FOCO' : 'VINCULAR A UM HÁBITO'}
                </Text>
                <Text
                  style={[
                    styles.habitSelectorTitle,
                    { color: selectedHabit ? theme.textPrimary : theme.textSecondary },
                  ]}
                  numberOfLines={1}>
                  {selectedHabit ? selectedHabit.title : 'Foco Geral (nenhum selecionado)'}
                </Text>
                {selectedCategory && (
                  <View style={styles.categoryPillRow}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: selectedCategory.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: selectedCategory.color },
                      ]}>
                      {selectedCategory.name}
                    </Text>
                    {selectedHabit?.completed && (
                      <Text
                        style={[
                          styles.completedFlag,
                          { color: MomentusColors.emeraldNeon },
                        ]}>
                        • Concluído hoje ✓
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.habitSelectorRight}>
              {selectedHabit ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setSelectedHabitId(null);
                    triggerHaptic('impact');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.removeHabitBtn,
                    { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}>
                  <Ionicons name="close" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.chooseHabitBadge,
                    { backgroundColor: `${activeColor}18`, borderColor: `${activeColor}40` },
                  ]}>
                  <Text style={[styles.chooseHabitBadgeText, { color: activeColor }]}>
                    Escolher
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={activeColor} />
                </View>
              )}
            </View>
          </TouchableOpacity>
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
              mode === 'FOCUS' && { backgroundColor: getModeColor('FOCUS') },
            ]}
            onPress={() => switchMode('FOCUS')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                {
                  color:
                    mode === 'FOCUS'
                      ? getContrastTextColor(getModeColor('FOCUS'))
                      : theme.textSecondary,
                },
                mode === 'FOCUS' && { fontWeight: '800' },
              ]}>
              Foco ({focusDurationMinutes}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'SHORT_BREAK' && { backgroundColor: getModeColor('SHORT_BREAK') },
            ]}
            onPress={() => switchMode('SHORT_BREAK')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                {
                  color:
                    mode === 'SHORT_BREAK'
                      ? getContrastTextColor(getModeColor('SHORT_BREAK'))
                      : theme.textSecondary,
                },
                mode === 'SHORT_BREAK' && { fontWeight: '800' },
              ]}>
              Curta ({shortBreakMinutes}m)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              mode === 'LONG_BREAK' && { backgroundColor: getModeColor('LONG_BREAK') },
            ]}
            onPress={() => switchMode('LONG_BREAK')}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.modeTabText,
                {
                  color:
                    mode === 'LONG_BREAK'
                      ? getContrastTextColor(getModeColor('LONG_BREAK'))
                      : theme.textSecondary,
                },
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
                borderColor: `${activeColor}55`,
                shadowColor: activeColor,
                backgroundColor: theme.isDark
                  ? 'rgba(30, 41, 59, 0.6)'
                  : 'rgba(241, 245, 249, 0.8)',
              },
            ]}>
            <View
              style={[
                styles.innerCircle,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <Text style={[styles.modeStatusLabel, { color: theme.textSecondary }]}>
                {modeLabel}
              </Text>
              <Text style={[styles.timerDisplay, { color: theme.textPrimary }]}>
                {timeFormatted}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isRunning
                    ? { backgroundColor: `${activeColor}20` }
                    : { backgroundColor: theme.isDark ? '#283548' : '#F1F5F9' },
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isRunning ? activeColor : theme.textSecondary },
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
              { backgroundColor: isRunning ? MomentusColors.dangerRed : activeColor },
            ]}
            activeOpacity={0.85}>
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={32}
              color={isRunning ? '#FFFFFF' : getContrastTextColor(activeColor)}
            />
            <Text
              style={[
                styles.playBtnText,
                { color: isRunning ? '#FFFFFF' : getContrastTextColor(activeColor) },
              ]}>
              {isRunning ? 'PAUSAR' : mode === 'FOCUS' ? 'FOCO' : 'PAUSA'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setTempFocus(Number(focusDurationMinutes) || 25);
              setTempShort(Number(shortBreakMinutes) || 5);
              setTempLong(Number(longBreakMinutes) || 15);
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
            <Ionicons name="checkmark-done-circle" size={20} color={activeColor} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {completedSessions}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Sessões Concluídas
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.outline }]} />

          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color={MomentusColors.gold} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              +{xpGained} XP
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              XP Ganho na Sessão
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: theme.outline }]} />

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={20} color={activeColor} />
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>
              {userProfile.focusMinutesToday} min
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Foco Hoje
            </Text>
          </View>
        </View>

        {/* Modal de Seleção de Hábito do Dia */}
        <Modal
          visible={showHabitPickerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHabitPickerModal(false)}>
          <View style={styles.pickerOverlay}>
            <View
              style={[
                styles.habitPickerContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              {/* Modal Header */}
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHeaderLeft}>
                  <View
                    style={[
                      styles.pickerHeaderIconBg,
                      { backgroundColor: `${activeColor}20` },
                    ]}>
                    <Ionicons name="flag" size={18} color={activeColor} />
                  </View>
                  <View>
                    <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                      Vincular a um Hábito
                    </Text>
                    <Text style={[styles.pickerSubtitle, { color: theme.textSecondary }]}>
                      Hábitos agendados para hoje
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowHabitPickerModal(false)}
                  style={[styles.pickerCloseBtn, { backgroundColor: theme.surfaceElevated }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Opção Foco Geral / Sem Vínculo */}
              <TouchableOpacity
                style={[
                  styles.habitOptionItem,
                  selectedHabitId === null && {
                    borderColor: activeColor,
                    backgroundColor: `${activeColor}12`,
                  },
                  { borderColor: theme.outline },
                ]}
                onPress={() => {
                  setSelectedHabitId(null);
                  setShowHabitPickerModal(false);
                  triggerHaptic('impact');
                }}>
                <View style={styles.habitOptionLeft}>
                  <View
                    style={[
                      styles.categoryColorDot,
                      { backgroundColor: `${theme.textSecondary}40` },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.habitOptionTitle,
                        {
                          color:
                            selectedHabitId === null
                              ? activeColor
                              : theme.textPrimary,
                        },
                      ]}>
                      Foco Geral (Sem Vínculo)
                    </Text>
                    <Text style={[styles.habitOptionSubtitle, { color: theme.textSecondary }]}>
                      Acumula minutos de foco e XP livremente
                    </Text>
                  </View>
                </View>
                {selectedHabitId === null && (
                  <Ionicons name="checkmark-circle" size={20} color={activeColor} />
                )}
              </TouchableOpacity>

              {/* Lista de Hábitos de Hoje */}
              <ScrollView
                style={{ maxHeight: 320, marginTop: 4 }}
                showsVerticalScrollIndicator={false}>
                {todayHabits.length === 0 ? (
                  <View style={styles.emptyHabitsBox}>
                    <Ionicons
                      name="calendar-outline"
                      size={28}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.emptyHabitsText,
                        { color: theme.textSecondary },
                      ]}>
                      Nenhum hábito cadastrado para hoje.{'\n'}
                      Você pode usar o Foco Geral livremente.
                    </Text>
                  </View>
                ) : (
                  todayHabits.map((h) => {
                    const cat = categories.find((c) => c.id === h.categoryId);
                    const isSelected = selectedHabitId === h.id;
                    const catColor = cat?.color || activeColor;
                    return (
                      <TouchableOpacity
                        key={h.id}
                        style={[
                          styles.habitOptionItem,
                          isSelected && {
                            borderColor: catColor,
                            backgroundColor: `${catColor}15`,
                          },
                          { borderColor: theme.outline },
                        ]}
                        onPress={() => {
                          setSelectedHabitId(h.id);
                          setShowHabitPickerModal(false);
                          triggerHaptic('impact');
                        }}>
                        <View style={styles.habitOptionLeft}>
                          <View
                            style={[
                              styles.categoryColorDot,
                              { backgroundColor: catColor },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.habitOptionTitle,
                                {
                                  color: isSelected
                                    ? catColor
                                    : theme.textPrimary,
                                },
                              ]}>
                              {h.title}
                            </Text>
                            <View style={styles.habitMetaRow}>
                              {cat && (
                                <Text
                                  style={[
                                    styles.habitCatTag,
                                    { color: cat.color },
                                  ]}>
                                  {cat.name}
                                </Text>
                              )}
                              {h.timeStart && (
                                <Text
                                  style={[
                                    styles.habitTimeTag,
                                    { color: theme.textSecondary },
                                  ]}>
                                  • {h.timeStart}
                                </Text>
                              )}
                              {h.completed && (
                                <Text
                                  style={[
                                    styles.habitCompletedTag,
                                    { color: MomentusColors.emeraldNeon },
                                  ]}>
                                  • Concluído ✓
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={catColor}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

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

              {/* 1. Chips de Opções Selecionáveis (5 opções por ciclo) */}
              <View style={styles.pickerQuickChipsRow}>
                {(activeSettingsTab === 'FOCUS'
                  ? [15, 20, 25, 30, 45]
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

              {/* 2. Stepper de Ajuste Fino (Abaixo das opções selecionáveis) */}
              <View style={[styles.pickerStepperCard, { borderColor: theme.outline }]}>
                <TouchableOpacity
                  style={[
                    styles.pickerStepperBtn,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}
                  onPress={() => {
                    if (activeSettingsTab === 'FOCUS') {
                      setTempFocus((prev) => Math.max(1, Number(prev) - 1));
                    } else if (activeSettingsTab === 'SHORT_BREAK') {
                      setTempShort((prev) => Math.max(1, Number(prev) - 1));
                    } else {
                      setTempLong((prev) => Math.max(1, Number(prev) - 1));
                    }
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name="remove" size={18} color={theme.textPrimary} />
                </TouchableOpacity>

                <View style={styles.pickerStepperLabelCol}>
                  <Text style={[styles.pickerStepperLabel, { color: theme.textSecondary }]}>
                    Ajuste fino ±1 min
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.pickerStepperBtn,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}
                  onPress={() => {
                    if (activeSettingsTab === 'FOCUS') {
                      setTempFocus((prev) => Math.min(120, Number(prev) + 1));
                    } else if (activeSettingsTab === 'SHORT_BREAK') {
                      setTempShort((prev) => Math.min(30, Number(prev) + 1));
                    } else {
                      setTempLong((prev) => Math.min(60, Number(prev) + 1));
                    }
                    triggerHaptic('impact');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  header: {
    paddingTop: 8,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  pomodoroFlowContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cycleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cycleInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cycleStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  xpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cycleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tickingToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tickingToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cycleRulerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cycleCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  cycleNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cycleLabelText: {
    fontSize: 11,
  },
  flowDivider: {
    height: 1,
    opacity: 0.5,
  },
  habitSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  habitSelectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  habitSelectorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitSelectorTextCol: {
    flex: 1,
  },
  habitSelectorOverline: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  habitSelectorTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  categoryPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completedFlag: {
    fontSize: 10,
    fontWeight: '700',
  },
  habitSelectorRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeHabitBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseHabitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  chooseHabitBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  habitPickerContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    gap: 10,
  },
  habitOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  habitOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  habitOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  habitOptionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  habitCatTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  habitTimeTag: {
    fontSize: 11,
  },
  habitCompletedTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyHabitsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyHabitsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
