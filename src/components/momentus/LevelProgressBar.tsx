import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

export const LevelProgressBar: React.FC = () => {
  const { userProfile, userLevel, theme } = useMomentus();
  const xpPercent = Math.min(100, Math.round(userLevel.progress * 100));

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
      <View style={styles.topRow}>
        <View style={styles.userProfileGroup}>
          <View style={[styles.avatar, { backgroundColor: theme.primary, borderColor: userLevel.rankColor }]}>
            <Text style={[styles.avatarText, { color: getContrastTextColor(theme.primary) }]}>
              {userProfile.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: theme.textPrimary }]}>Olá, {userProfile.name} 👋</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.levelBadge, { backgroundColor: `${userLevel.rankColor}20` }]}>
                <Ionicons name="sparkles" size={12} color={userLevel.rankColor} />
                <Text style={[styles.levelText, { color: userLevel.rankColor }]}>
                  Nível {userLevel.level} • {userLevel.rankName}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.coinsBadge}>
          <Ionicons name="sparkles" size={14} color={MomentusColors.gold} />
          <Text style={styles.coinsText}>{userProfile.totalPoints} XP</Text>
        </View>
      </View>

      <View style={styles.xpBarContainer}>
        <View style={styles.xpLabelsRow}>
          <Text style={[styles.xpLabel, { color: theme.textSecondary }]}>Progresso para o próximo nível</Text>
          <Text style={[styles.xpValues, { color: theme.textSecondary }]}>
            {userLevel.currentXp} / {userLevel.nextLevelXp} ({xpPercent}%)
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.outline }]}>
          <View
            style={[
              styles.fill,
              { width: `${xpPercent}%`, backgroundColor: userLevel.rankColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  userProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MomentusColors.emeraldDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greeting: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinsText: {
    color: MomentusColors.gold,
    fontWeight: 'bold',
    fontSize: 13,
  },
  xpBarContainer: {
    marginTop: 2,
  },
  xpLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
  },
  xpValues: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 8,
    backgroundColor: MomentusColors.navyOutline,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
