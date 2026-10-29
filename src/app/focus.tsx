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
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString } from '@/constants/initialData';
import { getAppKv, setAppKv } from '@/database/momentusDb';
import {
  soundManager,
  SoundscapeType,
  SOUNDSCAPE_OPTIONS,
} from '@/util/soundManager';
import {
  scheduleFocusNotification,
  cancelFocusNotification,
} from '@/services/notificationService';
import { useLocalSearchParams } from 'expo-router';

type FocusMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
type FocusSettingsTab = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export default function FocusScreen() {
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
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

  // Pilar 4: Auto-Avanço Contínuo
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartFocus, setAutoStartFocus] = useState(false);
  const autoStartBreaksRef = useRef(autoStartBreaks);
  const autoStartFocusRef = useRef(autoStartFocus);

  // Pilar 5: Proteção Contra Cancelamento Acidental
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [pendingAbandonAction, setPendingAbandonAction] = useState<'RESET' | 'SKIP' | null>(null);

  // Pilar 6: Meta Diária de Foco Visual
  const [dailyFocusGoal, setDailyFocusGoal] = useState(100);
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    autoStartBreaksRef.current = autoStartBreaks;
    autoStartFocusRef.current = autoStartFocus;
  }, [autoStartBreaks, autoStartFocus]);

  const [mode, setMode] = useState<FocusMode>('FOCUS');
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [xpGained, setXpGained] = useState(0);

  // Vínculo com Hábito do Dia
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showHabitPickerModal, setShowHabitPickerModal] = useState(false);

  // Seleciona automaticamente o hábito caso venha por parâmetro de navegação (ex: da tela Home)
  useEffect(() => {
    if (habitId && typeof habitId === 'string') {
      setSelectedHabitId(habitId);
    }
  }, [habitId]);

  // Som de foco suave / Tique-taque
  const [tickingEnabled, setTickingEnabled] = useState(false);

  // Paisagens Sonoras / Sons de Ambiente (Soundscapes)
  const [soundscape, setSoundscape] = useState<SoundscapeType>('none');
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(0.6);
  const [showSoundscapeModal, setShowSoundscapeModal] = useState(false);

  const handleSoundscapePress = () => {
    triggerHaptic('impact');
    setShowSoundscapeModal(true);
  };

  // Modo Imersivo / Deep Focus (Tela Cheia / Relógio de Mesa)
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  const [deepControlsVisible, setDeepControlsVisible] = useState(true);

  // Tempo restante em segundos
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);

  const timerRef = useRef<any>(null);
  const endTimeRef = useRef<number | null>(null);
  const onTimerFinishedRef = useRef<() => void>(() => {});
  const timeLeftRef = useRef(timeLeft);
  const notificationIdRef = useRef<string | null>(null);
  const lastTickSecondRef = useRef<number>(-1);

  // Animações: Breathing Pulse e Modo Zen (foco sem distrações)
  const [breathingAnim] = useState(() => new Animated.Value(1));
  const [zenAnim] = useState(() => new Animated.Value(1));

  // Animação de respiração suave (ciclo rítmico de 5s)
  useEffect(() => {
    if (isRunning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.05,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1.0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      breathingAnim.setValue(1);
    }
  }, [isRunning, breathingAnim]);

  // Modo Zen: reduz suavemente a opacidade de elementos periféricos durante o foco
  useEffect(() => {
    Animated.timing(zenAnim, {
      toValue: isRunning ? 0.35 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isRunning, zenAnim]);

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

    getAppKv<SoundscapeType>('focus_soundscape').then((saved) => {
      if (saved) {
        setSoundscape(saved);
        soundManager.setSoundscape(saved, false);
      }
    });

    getAppKv<number>('focus_soundscape_volume').then((savedVol) => {
      if (typeof savedVol === 'number') {
        setSoundscapeVolume(savedVol);
        soundManager.setSoundscapeVolume(savedVol);
      }
    });

    getAppKv<boolean>('focus_auto_start_breaks').then((saved) => {
      if (typeof saved === 'boolean') {
        setAutoStartBreaks(saved);
      }
    });

    getAppKv<boolean>('focus_auto_start_focus').then((saved) => {
      if (typeof saved === 'boolean') {
        setAutoStartFocus(saved);
      }
    });

    getAppKv<number>('focus_daily_goal').then((savedGoal) => {
      if (typeof savedGoal === 'number' && savedGoal > 0) {
        setDailyFocusGoal(savedGoal);
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

    return () => {
      soundManager.pauseSoundscape();
    };
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

  const startTimerDirectly = useCallback(
    (targetMode: FocusMode, targetSecs: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const targetEndTime = Date.now() + targetSecs * 1000;
      endTimeRef.current = targetEndTime;
      setTimeLeft(targetSecs);
      setTotalSeconds(targetSecs);
      setIsRunning(true);
      soundManager.playSuccessSound();

      if (targetMode === 'FOCUS' && soundscape !== 'none') {
        soundManager.resumeSoundscape();
      }

      const linkedHabit = habits.find((h) => h.id === selectedHabitId);
      scheduleFocusNotification(targetSecs, targetMode, linkedHabit?.title).then((id) => {
        notificationIdRef.current = id || null;
      });

      setAppKv('active_focus_timer', {
        endTime: targetEndTime,
        mode: targetMode,
        selectedHabitId,
        totalSeconds: targetSecs,
      }).catch(() => {});
    },
    [habits, selectedHabitId, soundscape]
  );

  const switchMode = useCallback(
    (newMode: FocusMode) => {
      if (timerRef.current) clearInterval(timerRef.current);
      endTimeRef.current = null;
      setIsRunning(false);
      soundManager.pauseSoundscape();
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
    soundManager.pauseSoundscape();
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
      const nextMode: FocusMode = nextSessions % 4 === 0 ? 'LONG_BREAK' : 'SHORT_BREAK';
      switchMode(nextMode);

      // Pilar 4: Auto-Avanço Contínuo (inicia pausa automaticamente)
      if (autoStartBreaksRef.current) {
        const nextSecs = getDurationForMode(nextMode);
        setTimeout(() => {
          startTimerDirectly(nextMode, nextSecs);
        }, 800);
      }
    } else {
      Alert.alert('Pausa Finalizada! ⚡', 'Hora de retomar o foco total.');
      switchMode('FOCUS');

      // Pilar 4: Auto-Avanço Contínuo (inicia próximo foco automaticamente)
      if (autoStartFocusRef.current) {
        const nextSecs = getDurationForMode('FOCUS');
        setTimeout(() => {
          startTimerDirectly('FOCUS', nextSecs);
        }, 800);
      }
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
    getDurationForMode,
    startTimerDirectly,
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
          if (Platform.OS !== 'web') {
            triggerHaptic('selection');
          }
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
  }, [isRunning, mode, tickingEnabled, triggerHaptic]);

  const toggleTimer = () => {
    triggerHaptic('impact');
    if (!isRunning) {
      // Inicia a contagem baseada na hora atual + segundos restantes
      const targetEndTime = Date.now() + timeLeft * 1000;
      endTimeRef.current = targetEndTime;
      setIsRunning(true);
      soundManager.playSuccessSound();

      // Inicia som de ambiente se estiver no modo foco
      if (mode === 'FOCUS' && soundscape !== 'none') {
        soundManager.resumeSoundscape();
      }

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
      soundManager.pauseSoundscape();
      cancelFocusNotification(notificationIdRef.current);
      notificationIdRef.current = null;
      setAppKv('active_focus_timer', null).catch(() => {});
    }
  };

  const executeReset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endTimeRef.current = null;
    setIsRunning(false);
    soundManager.pauseSoundscape();
    cancelFocusNotification(notificationIdRef.current);
    notificationIdRef.current = null;
    setAppKv('active_focus_timer', null).catch(() => {});
    const secs = getDurationForMode(mode);
    setTimeLeft(secs);
    setTotalSeconds(secs);
    triggerHaptic('impact');
  }, [getDurationForMode, mode, triggerHaptic]);

  const executeSkip = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endTimeRef.current = null;
    setIsRunning(false);
    soundManager.pauseSoundscape();
    cancelFocusNotification(notificationIdRef.current);
    notificationIdRef.current = null;
    setAppKv('active_focus_timer', null).catch(() => {});

    if (mode === 'FOCUS') {
      const nextSessions = completedSessions + 1;
      setCompletedSessions(nextSessions);
      if (nextSessions % 4 === 0) {
        switchMode('LONG_BREAK');
      } else {
        switchMode('SHORT_BREAK');
      }
    } else {
      switchMode('FOCUS');
    }
    triggerHaptic('impact');
  }, [completedSessions, mode, switchMode, triggerHaptic]);

  // Pilar 5: Proteção Contra Cancelamento Acidental (>60s decorridos ou em andamento)
  const requestReset = () => {
    const elapsed = totalSeconds - timeLeft;
    if (mode === 'FOCUS' && (isRunning || elapsed >= 60)) {
      triggerHaptic('impact');
      setPendingAbandonAction('RESET');
      setShowAbandonModal(true);
    } else {
      executeReset();
    }
  };

  const requestSkip = () => {
    const elapsed = totalSeconds - timeLeft;
    if (mode === 'FOCUS' && (isRunning || elapsed >= 60)) {
      triggerHaptic('impact');
      setPendingAbandonAction('SKIP');
      setShowAbandonModal(true);
    } else {
      executeSkip();
    }
  };

  const confirmAbandon = () => {
    setShowAbandonModal(false);
    if (pendingAbandonAction === 'RESET') {
      executeReset();
    } else if (pendingAbandonAction === 'SKIP') {
      executeSkip();
    }
    setPendingAbandonAction(null);
  };

  // Pilar 6: Ajuste da Meta Diária de Foco
  const handleSetDailyGoal = (targetMinutes: number) => {
    setDailyFocusGoal(targetMinutes);
    setAppKv('focus_daily_goal', targetMinutes).catch(() => {});
    setShowGoalModal(false);
    triggerHaptic('success');
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

  const today = getTodayDateString();
  const todayHabits = habits.filter((h) => h.date === today);
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) || null;
  const selectedCategory = selectedHabit
    ? categories.find((c) => c.id === selectedHabit.categoryId)
    : null;

  const { height: windowHeight } = useWindowDimensions();
  const isCompact = windowHeight < 740;
  const isUltraCompact = windowHeight < 660;

  const RING_SIZE = isUltraCompact ? 190 : isCompact ? 220 : 252;
  const STROKE_WIDTH = isUltraCompact ? 8 : 10;
  const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progressFraction = totalSeconds > 0 ? timeLeft / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressFraction);

  const haloSize = RING_SIZE + (isUltraCompact ? 18 : 24);
  const innerSize = RING_SIZE - (STROKE_WIDTH * 2) - (isUltraCompact ? 14 : 20);
  const timerFontSize = isUltraCompact ? 36 : isCompact ? 42 : 48;

  const openCycleSettings = () => {
    setTempFocus(Number(focusDurationMinutes) || 25);
    setTempShort(Number(shortBreakMinutes) || 5);
    setTempLong(Number(longBreakMinutes) || 15);
    setActiveSettingsTab('FOCUS');
    setShowSettingsModal(true);
    triggerHaptic('impact');
  };



  const selectSoundscape = (type: SoundscapeType) => {
    setSoundscape(type);
    setAppKv('focus_soundscape', type).catch(() => {});
    triggerHaptic('selection');
    if (isRunning && mode === 'FOCUS') {
      soundManager.setSoundscape(type, true);
    } else {
      soundManager.setSoundscape(type, false);
    }
  };

  const changeSoundscapeVolume = (vol: number) => {
    setSoundscapeVolume(vol);
    soundManager.setSoundscapeVolume(vol);
    setAppKv('focus_soundscape_volume', vol).catch(() => {});
    triggerHaptic('impact');
  };

  const renderSoundscapeDialog = (isDeep: boolean) => {
    const dialogBg = isDeep ? '#0D1527' : theme.surface;
    const dialogBorder = isDeep ? 'rgba(255, 255, 255, 0.18)' : theme.outline;
    const itemBg = isDeep ? 'rgba(255, 255, 255, 0.06)' : theme.surfaceElevated;
    const itemBorder = isDeep ? 'rgba(255, 255, 255, 0.12)' : theme.outline;
    const textPrimary = isDeep ? '#FFFFFF' : theme.textPrimary;
    const textSecondary = isDeep ? 'rgba(255, 255, 255, 0.65)' : theme.textSecondary;
    const closeBtnBg = isDeep ? 'rgba(255, 255, 255, 0.12)' : theme.surfaceElevated;

    return (
      <View
        style={[
          styles.pickerDialogContainer,
          { backgroundColor: dialogBg, borderColor: dialogBorder },
        ]}>
        {/* Cabeçalho */}
        <View style={styles.pickerHeader}>
          <View style={styles.pickerHeaderLeft}>
            <View style={[styles.pickerHeaderIconBg, { backgroundColor: `${activeColor}20` }]}>
              <Ionicons name="musical-notes" size={18} color={activeColor} />
            </View>
            <View>
              <Text style={[styles.pickerTitle, { color: textPrimary }]}>
                Paisagens Sonoras
              </Text>
              <Text style={[styles.pickerSubtitle, { color: textSecondary }]}>
                Áudio contínuo para isolamento acústico e foco
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowSoundscapeModal(false);
              triggerHaptic('impact');
            }}
            style={[styles.pickerCloseBtn, { backgroundColor: closeBtnBg }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fechar seletor de som">
            <Ionicons name="close" size={18} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Lista de Opções de Som e Volume com Scroll Suave */}
        <ScrollView
          style={styles.pickerModalScrollView}
          contentContainerStyle={styles.pickerModalScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={{ gap: 8, marginTop: 4 }}>
            {SOUNDSCAPE_OPTIONS.map((opt) => {
              const isSelected = soundscape === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.soundscapeOptionItem,
                    {
                      backgroundColor: isSelected ? `${activeColor}20` : itemBg,
                      borderColor: isSelected ? activeColor : itemBorder,
                    },
                  ]}
                  onPress={() => selectSoundscape(opt.id)}
                  activeOpacity={0.75}>
                  <View style={styles.soundscapeOptionLeft}>
                    <View
                      style={[
                        styles.soundscapeIconBg,
                        {
                          backgroundColor: isSelected
                            ? `${activeColor}35`
                            : isDeep
                            ? 'rgba(255, 255, 255, 0.1)'
                            : `${theme.textSecondary}15`,
                        },
                      ]}>
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={isSelected ? activeColor : textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.soundscapeOptionTitle,
                          { color: isSelected ? activeColor : textPrimary },
                        ]}>
                        {opt.label}
                      </Text>
                      <Text
                        style={[styles.soundscapeOptionSubtitle, { color: textSecondary }]}>
                        {opt.sublabel}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={activeColor} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Seletor de Volume (visível se tiver som selecionado) */}
          {soundscape !== 'none' && (
            <View
              style={[
                styles.soundscapeVolumeCard,
                {
                  backgroundColor: itemBg,
                  borderColor: itemBorder,
                  borderWidth: isDeep ? 1 : 0,
                },
              ]}>
              <View style={styles.soundscapeVolumeHeader}>
                <Ionicons name="volume-medium-outline" size={16} color={textSecondary} />
                <Text style={[styles.soundscapeVolumeTitle, { color: textSecondary }]}>
                  Volume do Ambiente: {Math.round(soundscapeVolume * 100)}%
                </Text>
              </View>
              <View style={styles.volumePresetsRow}>
                {[0.25, 0.5, 0.75, 1.0].map((v) => {
                  const isActive = Math.abs(soundscapeVolume - v) < 0.05;
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.volumePresetBtn,
                        {
                          backgroundColor: isActive
                            ? activeColor
                            : isDeep
                            ? 'rgba(255, 255, 255, 0.08)'
                            : theme.surface,
                          borderColor: isActive ? activeColor : itemBorder,
                        },
                      ]}
                      onPress={() => changeSoundscapeVolume(v)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.volumePresetText,
                          {
                            color: isActive
                              ? getContrastTextColor(activeColor)
                              : textSecondary,
                            fontWeight: isActive ? '800' : '600',
                          },
                        ]}>
                        {Math.round(v * 100)}%
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Botão de Fechar */}
        <View style={[styles.pickerActionsRow, { marginTop: 14 }]}>
          <TouchableOpacity
            style={[styles.pickerSaveBtn, { backgroundColor: activeColor, flex: 1 }]}
            onPress={() => {
              setShowSoundscapeModal(false);
              triggerHaptic('impact');
            }}
            activeOpacity={0.85}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={getContrastTextColor(activeColor)}
            />
            <Text
              style={[
                styles.pickerSaveBtnText,
                { color: getContrastTextColor(activeColor) },
              ]}>
              Concluir
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        {/* Bloco Superior: Cabeçalho com Ações Rápidas, Pílula de Contexto, Meta Diária e Abas */}
        <Animated.View style={[styles.topBlock, { opacity: zenAnim }]}>
          {/* Header com Título Principal, Subtítulo e Ações Rápidas */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Modo Foco</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Técnica Pomodoro com ganho contínuo de XP
              </Text>
            </View>
            <View style={styles.headerRightActions}>
              {/* Botão de Paisagem Sonora (Soundscape) */}
              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  {
                    backgroundColor: soundscape !== 'none' ? `${activeColor}20` : theme.surface,
                    borderColor: soundscape !== 'none' ? activeColor : theme.outline,
                  },
                ]}
                onPress={handleSoundscapePress}
                activeOpacity={0.7}
                accessibilityLabel="Paisagens Sonoras e ruído ambiente">
                <Ionicons
                  name={
                    soundscape === 'rain'
                      ? 'rainy-outline'
                      : soundscape === 'waves'
                      ? 'water-outline'
                      : soundscape === 'brown_noise'
                      ? 'disc-outline'
                      : soundscape === 'white_noise'
                      ? 'radio-outline'
                      : 'musical-notes-outline'
                  }
                  size={18}
                  color={soundscape !== 'none' ? activeColor : theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Botão de Tique-taque */}
              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  {
                    backgroundColor: tickingEnabled ? `${activeColor}20` : theme.surface,
                    borderColor: tickingEnabled ? activeColor : theme.outline,
                  },
                ]}
                onPress={toggleTicking}
                activeOpacity={0.7}
                accessibilityLabel="Alternar som de tique-taque">
                <Ionicons
                  name={tickingEnabled ? 'volume-high' : 'volume-mute-outline'}
                  size={18}
                  color={tickingEnabled ? activeColor : theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Botão de Modo Imersivo / Deep Focus (Tela Cheia) */}
              <TouchableOpacity
                style={[
                  styles.headerIconBtn,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.outline,
                  },
                ]}
                onPress={() => {
                  setIsDeepFocus(true);
                  setDeepControlsVisible(true);
                  triggerHaptic('impact');
                }}
                activeOpacity={0.7}
                accessibilityLabel="Entrar no Modo Imersivo Tela Cheia">
                <Ionicons name="expand-outline" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              {/* Botão de Ajustes de Ciclo Pomodoro */}
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                onPress={openCycleSettings}
                activeOpacity={0.7}
                accessibilityLabel="Ajustes de ciclo Pomodoro">
                <Ionicons name="settings-outline" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pílula de Contexto Única: Hábito Vinculado & 4 Pontos do Ciclo Pomodoro */}
          <View style={styles.contextPillWrapper}>
            <TouchableOpacity
              style={[
                styles.contextPill,
                {
                  backgroundColor: theme.surface,
                  borderColor: selectedHabit ? `${selectedCategory?.color || activeColor}60` : theme.outline,
                },
              ]}
              onPress={() => {
                setShowHabitPickerModal(true);
                triggerHaptic('impact');
              }}
              activeOpacity={0.75}>
              <View style={styles.contextPillLeft}>
                <View
                  style={[
                    styles.contextPillDot,
                    { backgroundColor: selectedCategory?.color || activeColor },
                  ]}
                />
                <Text
                  style={[styles.contextPillText, { color: theme.textPrimary }]}
                  numberOfLines={1}>
                  {selectedHabit ? selectedHabit.title : 'Foco Geral'}
                </Text>
                {selectedHabit?.completed && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={MomentusColors.emeraldNeon}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>

              <Text style={[styles.contextPillSep, { color: theme.textSecondary }]}>•</Text>

              {/* 4 Pontos Sutis Pomodoro */}
              <View style={styles.miniCyclesRow}>
                {[1, 2, 3, 4].map((cycleNum) => {
                  const isDone = (completedSessions % 4) >= cycleNum;
                  const isCurrent = (completedSessions % 4) + 1 === cycleNum && mode === 'FOCUS';
                  return (
                    <View
                      key={cycleNum}
                      style={[
                        styles.miniCycleDot,
                        {
                          backgroundColor: isDone
                            ? activeColor
                            : isCurrent
                            ? `${activeColor}80`
                            : theme.outline,
                          transform: [{ scale: isCurrent ? 1.25 : 1 }],
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <Ionicons name="chevron-down" size={14} color={theme.textSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          {/* Pilar 6: Meta Diária de Foco Visual (Barra de Progresso & Troféu) */}
          <TouchableOpacity
            style={[
              styles.dailyGoalCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}
            onPress={() => {
              setShowGoalModal(true);
              triggerHaptic('impact');
            }}
            activeOpacity={0.8}
            accessibilityLabel="Meta diária de minutos de foco. Toque para ajustar.">
            <View style={styles.dailyGoalHeader}>
              <View style={styles.dailyGoalLeft}>
                <Ionicons
                  name={userProfile.focusMinutesToday >= dailyFocusGoal ? 'trophy' : 'flame'}
                  size={16}
                  color={userProfile.focusMinutesToday >= dailyFocusGoal ? MomentusColors.gold : activeColor}
                />
                <Text style={[styles.dailyGoalTitle, { color: theme.textPrimary }]}>
                  Meta Diária
                </Text>
                <Text style={[styles.dailyGoalProgressText, { color: theme.textSecondary }]}>
                  {userProfile.focusMinutesToday} / {dailyFocusGoal} min
                </Text>
              </View>
              <View
                style={[
                  styles.dailyGoalBadge,
                  {
                    backgroundColor:
                      userProfile.focusMinutesToday >= dailyFocusGoal
                        ? `${MomentusColors.gold}25`
                        : `${activeColor}15`,
                  },
                ]}>
                <Text
                  style={[
                    styles.dailyGoalBadgeText,
                    {
                      color:
                        userProfile.focusMinutesToday >= dailyFocusGoal
                          ? MomentusColors.gold
                          : activeColor,
                    },
                  ]}>
                  {userProfile.focusMinutesToday >= dailyFocusGoal
                    ? 'Concluída! 🏆'
                    : `${Math.min(100, Math.round((userProfile.focusMinutesToday / dailyFocusGoal) * 100))}%`}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.dailyGoalTrack,
                { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}>
              <View
                style={[
                  styles.dailyGoalFill,
                  {
                    width: `${Math.min(100, Math.round((userProfile.focusMinutesToday / dailyFocusGoal) * 100))}%`,
                    backgroundColor:
                      userProfile.focusMinutesToday >= dailyFocusGoal
                        ? MomentusColors.gold
                        : activeColor,
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Tab Switcher: Foco / Pausa Curta / Pausa Longa */}
          <View
            style={[
              styles.modeTabsRow,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            {(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK'] as FocusMode[]).map((tabMode) => {
              const isCurrent = mode === tabMode;
              const tabLabels = {
                FOCUS: `Foco (${focusDurationMinutes}m)`,
                SHORT_BREAK: `Curta (${shortBreakMinutes}m)`,
                LONG_BREAK: `Longa (${longBreakMinutes}m)`,
              };
              return (
                <TouchableOpacity
                  key={tabMode}
                  style={[
                    styles.modeTab,
                    isCurrent && { backgroundColor: getModeColor(tabMode) },
                  ]}
                  onPress={() => switchMode(tabMode)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.modeTabText,
                      {
                        color: isCurrent
                          ? getContrastTextColor(getModeColor(tabMode))
                          : theme.textSecondary,
                        fontWeight: isCurrent ? '800' : '600',
                      },
                    ]}>
                    {tabLabels[tabMode]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Big Circular Timer Display com Anel SVG Dinâmico & Breathing Pulse */}
        <View style={[styles.timerCenter, { marginVertical: isCompact ? 4 : 10 }]}>
          {/* Halo pulsante de respiração externa */}
          <Animated.View
            style={[
              styles.haloCircle,
              {
                width: haloSize,
                height: haloSize,
                borderRadius: haloSize / 2,
                borderColor: activeColor,
                transform: [{ scale: breathingAnim }],
                opacity: isRunning ? 0.35 : 0.12,
              },
            ]}
          />

          <View
            style={[
              styles.outerCircle,
              {
                width: RING_SIZE,
                height: RING_SIZE,
                borderRadius: RING_SIZE / 2,
                borderColor: 'transparent',
                shadowColor: activeColor,
                backgroundColor: theme.isDark
                  ? 'rgba(30, 41, 59, 0.65)'
                  : 'rgba(241, 245, 249, 0.85)',
              },
            ]}>
            {/* Anel SVG Contínuo com trilha e arco de contagem precisa */}
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <G transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke={theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                  strokeWidth={STROKE_WIDTH}
                  fill="transparent"
                />
                {progressFraction > 0 && (
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={activeColor}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                )}
              </G>
            </Svg>

            <View
              style={[
                styles.innerCircle,
                {
                  width: innerSize,
                  height: innerSize,
                  borderRadius: innerSize / 2,
                  backgroundColor: theme.surface,
                  borderColor: theme.outline,
                },
              ]}>
              <Text style={[styles.modeStatusLabel, { color: activeColor, fontSize: isUltraCompact ? 10 : 12 }]}>
                {mode === 'FOCUS' ? 'FOCO' : mode === 'SHORT_BREAK' ? 'PAUSA CURTA' : 'PAUSA LONGA'}
              </Text>
              <Text style={[styles.timerDisplay, { color: theme.textPrimary, fontSize: timerFontSize }]}>
                {timeFormatted}
              </Text>
            </View>
          </View>
        </View>

        {/* Bloco Inferior: Controles e Resumo de Sessão */}
        <View style={[styles.bottomBlock, isCompact && { gap: 4 }]}>
          {/* Controls: Reset, Play/Pause Central e Pular/Avançar com Proteção Anti-Cancelamento */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={requestReset}
              style={[
                styles.controlIconBtn,
                { backgroundColor: theme.surface, borderColor: theme.outline },
                isCompact && { width: 44, height: 44, borderRadius: 22 },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Reiniciar cronômetro">
              <Ionicons name="refresh" size={isCompact ? 20 : 22} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTimer}
              style={[
                styles.playBtn,
                { backgroundColor: isRunning ? MomentusColors.dangerRed : activeColor },
                isCompact && { paddingHorizontal: 28, paddingVertical: 12 },
              ]}
              activeOpacity={0.85}
              accessibilityLabel={isRunning ? 'Pausar foco' : 'Iniciar foco'}>
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={isCompact ? 24 : 28}
                color={isRunning ? '#FFFFFF' : getContrastTextColor(activeColor)}
              />
              <Text
                style={[
                  styles.playBtnText,
                  { color: isRunning ? '#FFFFFF' : getContrastTextColor(activeColor) },
                  isCompact && { fontSize: 14 },
                ]}>
                {isRunning ? 'PAUSAR' : 'INICIAR'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={requestSkip}
              style={[
                styles.controlIconBtn,
                { backgroundColor: theme.surface, borderColor: theme.outline },
                isCompact && { width: 44, height: 44, borderRadius: 22 },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Avançar próximo ciclo">
              <Ionicons name="play-skip-forward-outline" size={isCompact ? 20 : 22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Sessão Stats Resumo Leve em Linha Única (Modo Zen esmaece suavemente durante o foco) */}
          <Animated.View style={{ opacity: zenAnim }}>
            <View style={[styles.statsSummaryRow, isCompact && { paddingVertical: 2, marginTop: 2 }]}>
              <View style={styles.statSummaryItem}>
                <Ionicons name="checkmark-done-circle-outline" size={14} color={activeColor} />
                <Text style={[styles.statSummaryText, { color: theme.textSecondary }]}>
                  <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{completedSessions}</Text> ciclos
                </Text>
              </View>

              <Text style={[styles.statSummaryDot, { color: theme.outline }]}>•</Text>

              <View style={styles.statSummaryItem}>
                <Ionicons name="time-outline" size={14} color={activeColor} />
                <Text style={[styles.statSummaryText, { color: theme.textSecondary }]}>
                  <Text style={{ fontWeight: '800', color: theme.textPrimary }}>{userProfile.focusMinutesToday}</Text> min hoje
                </Text>
              </View>

              <Text style={[styles.statSummaryDot, { color: theme.outline }]}>•</Text>

              <View style={styles.statSummaryItem}>
                <Ionicons name="flash-outline" size={14} color={MomentusColors.gold} />
                <Text style={[styles.statSummaryText, { color: theme.textSecondary }]}>
                  <Text style={{ fontWeight: '800', color: theme.textPrimary }}>+{xpGained}</Text> XP
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

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
                    size={13}
                    color={
                      activeSettingsTab === 'SHORT_BREAK'
                        ? getContrastTextColor(theme.primary)
                        : theme.textSecondary
                    }
                  />
                  <Text
                    numberOfLines={1}
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
                    Curta
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
                    size={13}
                    color={
                      activeSettingsTab === 'LONG_BREAK'
                        ? getContrastTextColor(theme.primary)
                        : theme.textSecondary
                    }
                  />
                  <Text
                    numberOfLines={1}
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
                    Longa
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Corpo Rolável do Modal (Garante compatibilidade total em qualquer tamanho de tela) */}
              <ScrollView
                style={styles.pickerModalScrollView}
                contentContainerStyle={styles.pickerModalScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}>
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

                {/* Pilar 4: Avanço Automático de Sessões (Hands-Free) */}
                <View
                  style={[
                    styles.autoAdvanceCard,
                    { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                  ]}>
                  <View style={styles.autoAdvanceHeader}>
                    <Ionicons name="repeat" size={15} color={theme.primary} />
                    <Text style={[styles.autoAdvanceSectionTitle, { color: theme.textPrimary }]}>
                      Avanço Contínuo (Hands-free)
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.autoAdvanceRow}
                    onPress={() => {
                      const next = !autoStartBreaks;
                      setAutoStartBreaks(next);
                      setAppKv('focus_auto_start_breaks', next).catch(() => {});
                      triggerHaptic('impact');
                    }}
                    activeOpacity={0.75}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.autoAdvanceLabel, { color: theme.textPrimary }]}>
                        Iniciar pausas automaticamente
                      </Text>
                      <Text style={[styles.autoAdvanceSublabel, { color: theme.textSecondary }]}>
                        Inicia a pausa logo após o foco terminar
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.switchTrack,
                        { backgroundColor: autoStartBreaks ? theme.primary : theme.outline },
                      ]}>
                      <View
                        style={[
                          styles.switchThumb,
                          { transform: [{ translateX: autoStartBreaks ? 18 : 2 }] },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.autoAdvanceRow,
                      { borderTopWidth: 1, borderTopColor: theme.outline, paddingTop: 8, marginTop: 4 },
                    ]}
                    onPress={() => {
                      const next = !autoStartFocus;
                      setAutoStartFocus(next);
                      setAppKv('focus_auto_start_focus', next).catch(() => {});
                      triggerHaptic('impact');
                    }}
                    activeOpacity={0.75}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.autoAdvanceLabel, { color: theme.textPrimary }]}>
                        Iniciar próximo foco automaticamente
                      </Text>
                      <Text style={[styles.autoAdvanceSublabel, { color: theme.textSecondary }]}>
                        Retoma o foco assim que o descanso terminar
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.switchTrack,
                        { backgroundColor: autoStartFocus ? theme.primary : theme.outline },
                      ]}>
                      <View
                        style={[
                          styles.switchThumb,
                          { transform: [{ translateX: autoStartFocus ? 18 : 2 }] },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>

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

        {/* Modal de Paisagens Sonoras / Som Ambiente (Modo Padrão) */}
        <Modal
          visible={showSoundscapeModal && !isDeepFocus}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSoundscapeModal(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowSoundscapeModal(false)}
            />
            {renderSoundscapeDialog(false)}
          </View>
        </Modal>

        {/* Modal Imersivo: Deep Focus / Relógio de Mesa Fullscreen (Pilar 3) */}
        <Modal
          visible={isDeepFocus}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            if (showSoundscapeModal) {
              setShowSoundscapeModal(false);
            } else {
              setIsDeepFocus(false);
            }
          }}>
          <View style={[styles.deepFocusContainer, { backgroundColor: theme.isDark ? '#040711' : '#0B1120' }]}>
            <StatusBar hidden />
            <TouchableOpacity
              activeOpacity={1}
              style={styles.deepFocusBackdrop}
              onPress={() => {
                if (showSoundscapeModal) {
                  setShowSoundscapeModal(false);
                } else {
                  setDeepControlsVisible((prev) => !prev);
                }
              }}>
              {/* Header do Deep Focus (Animado / Fade) */}
              <View
                style={[
                  styles.deepHeader,
                  { opacity: deepControlsVisible ? 1 : 0 },
                ]}>
                <View style={styles.deepHeaderLeft}>
                  <View
                    style={[
                      styles.contextPillDot,
                      { backgroundColor: selectedCategory?.color || activeColor },
                    ]}
                  />
                  <Text style={[styles.deepHabitTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {selectedHabit ? selectedHabit.title : 'Foco Profundo'}
                  </Text>
                </View>

                {/* Ciclos Pomodoro */}
                <View style={styles.deepCyclesRow}>
                  {[1, 2, 3, 4].map((cycleNum) => {
                    const isDone = (completedSessions % 4) >= cycleNum;
                    const isCurrent = (completedSessions % 4) + 1 === cycleNum && mode === 'FOCUS';
                    return (
                      <View
                        key={cycleNum}
                        style={[
                          styles.miniCycleDot,
                          {
                            backgroundColor: isDone
                              ? activeColor
                              : isCurrent
                              ? `${activeColor}99`
                              : 'rgba(255, 255, 255, 0.2)',
                            transform: [{ scale: isCurrent ? 1.3 : 1 }],
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Ações do Topo */}
                <View style={styles.deepHeaderActions}>
                  <TouchableOpacity
                    style={[
                      styles.deepIconBtn,
                      {
                        backgroundColor: soundscape !== 'none' ? `${activeColor}30` : 'rgba(255, 255, 255, 0.1)',
                        borderColor: soundscape !== 'none' ? activeColor : 'rgba(255, 255, 255, 0.2)',
                      },
                    ]}
                    onPress={handleSoundscapePress}
                    accessibilityLabel="Paisagens Sonoras e ruído ambiente">
                    <Ionicons
                      name={
                        soundscape === 'rain'
                          ? 'rainy-outline'
                          : soundscape === 'waves'
                          ? 'water-outline'
                          : soundscape === 'brown_noise'
                          ? 'disc-outline'
                          : soundscape === 'white_noise'
                          ? 'radio-outline'
                          : 'musical-notes-outline'
                      }
                      size={18}
                      color={soundscape !== 'none' ? activeColor : '#FFFFFF'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deepIconBtn, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }]}
                    onPress={() => {
                      setIsDeepFocus(false);
                      triggerHaptic('impact');
                    }}
                    accessibilityLabel="Sair da tela cheia">
                    <Ionicons name="contract-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Centro: Timer Circular Grande */}
              <View style={styles.deepTimerCenter}>
                <Animated.View
                  style={[
                    styles.deepHaloCircle,
                    {
                      borderColor: activeColor,
                      transform: [{ scale: breathingAnim }],
                      opacity: isRunning ? 0.35 : 0.12,
                    },
                  ]}
                />

                <View style={styles.deepOuterCircle}>
                  <Svg width={300} height={300} style={StyleSheet.absoluteFill}>
                    <G transform="rotate(-90 150 150)">
                      <Circle
                        cx={150}
                        cy={150}
                        r={140}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth={12}
                        fill="transparent"
                      />
                      {progressFraction > 0 && (
                        <Circle
                          cx={150}
                          cy={150}
                          r={140}
                          stroke={activeColor}
                          strokeWidth={12}
                          strokeDasharray={`${2 * Math.PI * 140} ${2 * Math.PI * 140}`}
                          strokeDashoffset={2 * Math.PI * 140 * (1 - progressFraction)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      )}
                    </G>
                  </Svg>

                  <View style={styles.deepInnerCircle}>
                    <Text style={[styles.deepModeLabel, { color: activeColor }]}>
                      {mode === 'FOCUS' ? 'FOCO PROFUNDO' : mode === 'SHORT_BREAK' ? 'PAUSA CURTA' : 'PAUSA LONGA'}
                    </Text>
                    <Text style={styles.deepTimerText}>{timeFormatted}</Text>
                  </View>
                </View>
              </View>

              {/* Controles Inferiores (Animados / Fade) */}
              <View
                style={[
                  styles.deepFooter,
                  { opacity: deepControlsVisible ? 1 : 0 },
                ]}>
                <View style={styles.controlsRow}>
                  <TouchableOpacity
                    onPress={requestReset}
                    style={[
                      styles.controlIconBtn,
                      { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' },
                    ]}
                    activeOpacity={0.7}
                    accessibilityLabel="Reiniciar cronômetro">
                    <Ionicons name="refresh" size={22} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={toggleTimer}
                    style={[
                      styles.playBtn,
                      { backgroundColor: isRunning ? MomentusColors.dangerRed : activeColor, minWidth: 160 },
                    ]}
                    activeOpacity={0.85}
                    accessibilityLabel={isRunning ? 'Pausar foco' : 'Iniciar foco'}>
                    <Ionicons
                      name={isRunning ? 'pause' : 'play'}
                      size={28}
                      color={isRunning ? '#FFFFFF' : getContrastTextColor(activeColor)}
                    />
                    <Text
                      style={[
                        styles.playBtnText,
                        { color: isRunning ? '#FFFFFF' : getContrastTextColor(activeColor) },
                      ]}>
                      {isRunning ? 'PAUSAR' : 'INICIAR'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={requestSkip}
                    style={[
                      styles.controlIconBtn,
                      { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' },
                    ]}
                    activeOpacity={0.7}
                    accessibilityLabel="Avançar próximo ciclo">
                    <Ionicons name="play-skip-forward-outline" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.deepHintText}>
                  Toque na tela para ocultar/exibir os controles
                </Text>
              </View>
            </TouchableOpacity>

            {/* Seletor de Paisagem Sonora no Modo Foco Profundo (Sobreposição direta sem colisão de Modais nativos) */}
            {showSoundscapeModal && (
              <View style={styles.deepSoundscapeOverlay}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => {
                    setShowSoundscapeModal(false);
                    triggerHaptic('impact');
                  }}
                />
                {renderSoundscapeDialog(true)}
              </View>
            )}
          </View>
        </Modal>

        {/* Pilar 5: Modal de Proteção Contra Cancelamento Acidental */}
        <Modal
          visible={showAbandonModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAbandonModal(false)}>
          <View style={styles.pickerOverlay}>
            <View
              style={[
                styles.abandonModalContainer,
                { backgroundColor: theme.surface, borderColor: MomentusColors.dangerRed },
              ]}>
              <View style={styles.abandonIconRow}>
                <View style={styles.abandonIconBg}>
                  <Ionicons name="warning-outline" size={26} color={MomentusColors.dangerRed} />
                </View>
              </View>
              <Text style={[styles.abandonTitle, { color: theme.textPrimary }]}>
                {pendingAbandonAction === 'RESET' ? 'Reiniciar Sessão de Foco?' : 'Pular Sessão de Foco?'}
              </Text>
              <Text style={[styles.abandonMessage, { color: theme.textSecondary }]}>
                Você já completou {Math.floor((totalSeconds - timeLeft) / 60)} min desta sessão.
                {'\n'}Se abandonar agora, o tempo decorrido e o bônus de XP acumulados serão descartados.
              </Text>

              <View style={styles.abandonActionsCol}>
                <TouchableOpacity
                  style={[styles.abandonKeepBtn, { backgroundColor: activeColor }]}
                  onPress={() => setShowAbandonModal(false)}
                  activeOpacity={0.85}>
                  <Ionicons name="play" size={16} color={getContrastTextColor(activeColor)} />
                  <Text style={[styles.abandonKeepBtnText, { color: getContrastTextColor(activeColor) }]}>
                    Continuar Focado
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.abandonConfirmBtn, { borderColor: theme.outline }]}
                  onPress={confirmAbandon}
                  activeOpacity={0.75}>
                  <Text style={[styles.abandonConfirmBtnText, { color: MomentusColors.dangerRed }]}>
                    Sim, Abandonar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Pilar 6: Modal de Escolha da Meta Diária de Foco */}
        <Modal
          visible={showGoalModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGoalModal(false)}>
          <View style={styles.pickerOverlay}>
            <View
              style={[
                styles.goalModalContainer,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHeaderLeft}>
                  <View style={[styles.pickerHeaderIconBg, { backgroundColor: `${activeColor}20` }]}>
                    <Ionicons name="flame" size={18} color={activeColor} />
                  </View>
                  <View>
                    <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
                      Meta Diária de Foco
                    </Text>
                    <Text style={[styles.pickerSubtitle, { color: theme.textSecondary }]}>
                      Escolha seu objetivo diário de produtividade
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowGoalModal(false)}
                  style={[styles.pickerCloseBtn, { backgroundColor: theme.surfaceElevated }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.goalPresetsGrid}>
                {[30, 60, 90, 100, 120, 180].map((goalOption) => {
                  const isSelected = dailyFocusGoal === goalOption;
                  return (
                    <TouchableOpacity
                      key={goalOption}
                      style={[
                        styles.goalOptionCard,
                        {
                          backgroundColor: isSelected ? `${activeColor}20` : theme.surfaceElevated,
                          borderColor: isSelected ? activeColor : theme.outline,
                        },
                      ]}
                      onPress={() => handleSetDailyGoal(goalOption)}
                      activeOpacity={0.75}>
                      <Text
                        style={[
                          styles.goalOptionNumber,
                          { color: isSelected ? activeColor : theme.textPrimary },
                        ]}>
                        {goalOption}
                      </Text>
                      <Text style={[styles.goalOptionUnit, { color: theme.textSecondary }]}>
                        min / dia
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 4 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  topBlock: {
    gap: 6,
  },
  bottomBlock: {
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextPillWrapper: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  contextPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
  },
  contextPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contextPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contextPillSep: {
    fontSize: 12,
    opacity: 0.4,
  },
  miniCyclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniCycleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  modeTabsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginTop: 2,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 11,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloCircle: {
    position: 'absolute',
    borderWidth: 2,
  },
  outerCircle: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modeStatusLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  timerDisplay: {
    fontSize: 52,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnText: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  statSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statSummaryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statSummaryDot: {
    fontSize: 12,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerDialogContainer: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '88%',
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
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
    marginBottom: 12,
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
    marginBottom: 12,
  },
  pickerTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 4,
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
    fontSize: 11.5,
    fontWeight: '600',
  },
  pickerTabItemTextActive: {
    fontWeight: '800',
  },
  pickerModalScrollView: {
    flexShrink: 1,
  },
  pickerModalScrollContent: {
    paddingBottom: 6,
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
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
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

  // Estilos de Paisagens Sonoras (Pilar 2)
  soundscapeOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  soundscapeOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  soundscapeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundscapeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  soundscapeOptionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  soundscapeVolumeCard: {
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  soundscapeVolumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  soundscapeVolumeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  volumePresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  volumePresetBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumePresetText: {
    fontSize: 11,
  },

  // Estilos do Modo Imersivo / Deep Focus (Pilar 3)
  deepFocusContainer: {
    flex: 1,
  },
  deepFocusBackdrop: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 36,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  deepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  deepHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 160,
  },
  deepHabitTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  deepCyclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deepHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deepIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepTimerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 'auto',
  },
  deepHaloCircle: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 2,
  },
  deepOuterCircle: {
    width: 300,
    height: 300,
    borderRadius: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  deepInnerCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  deepModeLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  deepTimerText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  deepFooter: {
    alignItems: 'center',
    gap: 16,
  },
  deepHintText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '500',
    textAlign: 'center',
  },
  deepSoundscapeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
    elevation: 24,
  },
  /* Pilar 6: Meta Diária de Foco */
  dailyGoalCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    gap: 8,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyGoalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dailyGoalTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dailyGoalProgressText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  dailyGoalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dailyGoalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dailyGoalTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  dailyGoalFill: {
    height: '100%',
    borderRadius: 3,
  },
  /* Pilar 4: Avanço Automático de Sessões */
  autoAdvanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  autoAdvanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoAdvanceSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  autoAdvanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoAdvanceLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  autoAdvanceSublabel: {
    fontSize: 11,
    marginTop: 1,
  },
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  /* Pilar 5: Modal de Proteção Contra Cancelamento Acidental */
  abandonModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  abandonIconRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  abandonMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  abandonActionsCol: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  abandonKeepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  abandonKeepBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  abandonConfirmBtn: {
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  /* Pilar 6: Modal de Meta Diária */
  goalModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    gap: 14,
  },
  goalPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  goalOptionCard: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalOptionNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  goalOptionUnit: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
