import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

export const StreakCard: React.FC = () => {
  const { habits, userProfile } = useMomentus();

  const totalToday = habits.length;
  const completedToday = habits.filter((h) => h.completed).length;
  const progressRatio = totalToday > 0 ? completedToday / totalToday : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const getMotivationMessage = () => {
    if (totalToday === 0) return 'Dia livre! Que tal planejar algo novo? ✨';
    if (completedToday === 0) return 'Vamos começar? O primeiro passo! 🚀';
    if (progressRatio < 0.5) return 'Ótimo começo! Continue focado. 💪';
    if (progressRatio < 1.0) return 'Mais da metade concluído! Quase lá. ⚡';
    return 'Dia perfeito! Todas as metas concluídas! 🏆';
  };

  return (
    <View style={styles.card}>
      <View style={styles.contentRow}>
        <View style={styles.leftColumn}>
          <Text style={styles.subtitle}>SEQUÊNCIA ATUAL</Text>
          <View style={styles.streakRow}>
            <View style={styles.flameContainer}>
              <Ionicons name="flame" size={32} color={MomentusColors.fireStreak} />
            </View>
            <Text style={styles.streakCount}>{userProfile.currentStreak} dias</Text>
          </View>
          <Text style={styles.motivationText}>{getMotivationMessage()}</Text>
        </View>

        <View style={styles.progressCircleContainer}>
          <View style={styles.circleBadge}>
            <Text style={styles.percentText}>{progressPercent}%</Text>
            <Text style={styles.ratioText}>
              {completedToday}/{totalToday}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flameContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCount: {
    color: MomentusColors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
  },
  motivationText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  progressCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderWidth: 3,
    borderColor: MomentusColors.emeraldNeon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratioText: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

