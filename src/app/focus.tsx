import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

export default function FocusScreen() {
  const { addFocusMinutes, userProfile } = useMomentus();

  // Durations available in minutes
  const DURATIONS = [15, 25, 45, 60];
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Update timeLeft when duration changes (if not running)
  const changeDuration = (minutes: number) => {
    if (isRunning) return;
    setSelectedDuration(minutes);
    setTimeLeft(minutes * 60);
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleCompletedSession();
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
  }, [isRunning]);

  const handleCompletedSession = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    addFocusMinutes(selectedDuration);
    Alert.alert(
      'Parabéns! 🎯',
      `Você completou ${selectedDuration} minutos de foco total! Ganhou +${selectedDuration * 2} XP e +${Math.floor(selectedDuration / 2)} moedas.`
    );
    setTimeLeft(selectedDuration * 60);
  };

  const toggleTimer = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    setIsRunning(false);
    setTimeLeft(selectedDuration * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = selectedDuration * 60;
  const progressRatio = (totalSeconds - timeLeft) / totalSeconds;
  const progressPercent = Math.round(progressRatio * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Modo Foco</Text>
          <Text style={styles.subtitle}>
            Elimine distrações e acumule pontos de produtividade
          </Text>
        </View>

        {/* Duration Selectors */}
        <View style={styles.durationsRow}>
          {DURATIONS.map((dur) => {
            const isSelected = selectedDuration === dur;
            return (
              <TouchableOpacity
                key={dur}
                disabled={isRunning}
                onPress={() => changeDuration(dur)}
                style={[
                  styles.durationBtn,
                  isSelected && styles.durationBtnSelected,
                  isRunning && !isSelected && { opacity: 0.4 },
                ]}>
                <Text
                  style={[
                    styles.durationText,
                    isSelected && styles.durationTextSelected,
                  ]}>
                  {dur}m
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Big Circular Timer Display */}
        <View style={styles.timerCenter}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Ionicons
                name={isRunning ? 'flame' : 'timer-outline'}
                size={36}
                color={isRunning ? MomentusColors.fireStreak : MomentusColors.emeraldNeon}
              />
              <Text style={styles.timerDisplay}>{timeFormatted}</Text>
              <Text style={styles.timerStatus}>
                {isRunning ? `${progressPercent}% CONCLUÍDO` : 'PRONTO PARA FOCAR'}
              </Text>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={resetTimer}
            style={styles.controlIconBtn}>
            <Ionicons name="refresh" size={26} color={MomentusColors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTimer}
            style={[
              styles.playBtn,
              isRunning && styles.pauseBtn,
            ]}>
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={34}
              color="#0F172A"
            />
          </TouchableOpacity>

          <View style={styles.dummySpace} />
        </View>

        {/* Daily Stats Footer */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color={MomentusColors.emeraldNeon} />
            <Text style={styles.statValue}>{userProfile.focusMinutesToday} min</Text>
            <Text style={styles.statLabel}>Foco Hoje</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="flame" size={20} color={MomentusColors.fireStreak} />
            <Text style={styles.statValue}>{userProfile.currentStreak} dias</Text>
            <Text style={styles.statLabel}>Ofensiva</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="cash" size={20} color={MomentusColors.gold} />
            <Text style={styles.statValue}>+{Math.floor(selectedDuration / 2)}</Text>
            <Text style={styles.statLabel}>Recompensa</Text>
          </View>
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
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  header: {
    paddingTop: 12,
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
  durationsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  durationBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
  },
  durationBtnSelected: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: MomentusColors.emeraldNeon,
  },
  durationText: {
    color: MomentusColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  durationTextSelected: {
    color: MomentusColors.emeraldNeon,
  },
  timerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 4,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  innerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: MomentusColors.navySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
  },
  timerDisplay: {
    color: MomentusColors.textPrimary,
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  timerStatus: {
    color: MomentusColors.emeraldNeon,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 10,
  },
  controlIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: MomentusColors.emeraldNeon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  pauseBtn: {
    backgroundColor: MomentusColors.gold,
  },
  dummySpace: {
    width: 50,
    height: 50,
  },
  statsCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: MomentusColors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  statLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: MomentusColors.navyOutline,
  },
});
