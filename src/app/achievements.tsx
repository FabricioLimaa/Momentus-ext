import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { MarketItem } from '@/types';

export default function AchievementsScreen() {
  const { achievements, marketItems, userProfile, userLevel, buyMarketItem } = useMomentus();
  const [activeTab, setActiveTab] = useState<'achievements' | 'market'>('achievements');

  const handleBuy = (item: MarketItem) => {
    if (item.isOwned) return;
    const success = buyMarketItem(item.id);
    if (success) {
      Alert.alert('Sucesso! 🎉', `Você adquiriu "${item.name}"!`);
    } else {
      Alert.alert(
        'Pontos de XP insuficientes! ⭐',
        `Você precisa de ${item.finalPrice} XP para adquirir este item. Complete mais hábitos e blocos de foco para acumular pontos!`
      );
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON':
        return '#94A3B8';
      case 'RARE':
        return '#3B82F6';
      case 'EPIC':
        return '#A855F7';
      case 'LEGENDARY':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={[styles.avatarLarge, { borderColor: userLevel.rankColor }]}>
              <Text style={styles.avatarLargeText}>{userProfile.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <View style={[styles.titleBadge, { backgroundColor: `${userLevel.rankColor}20` }]}>
                  <Text style={[styles.titleBadgeText, { color: userLevel.rankColor }]}>
                    {userLevel.rankName}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileLevelText}>
                Nível {userLevel.level} • {userLevel.currentXp}/{userLevel.nextLevelXp} XP
              </Text>
            </View>
            <View style={styles.coinsHeaderBox}>
              <Ionicons name="sparkles" size={16} color={MomentusColors.gold} />
              <Text style={styles.coinsHeaderText}>{userProfile.totalPoints} XP</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile.currentStreak}d</Text>
              <Text style={styles.statLabel}>Ofensiva Atual</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile.bestStreak}d</Text>
              <Text style={styles.statLabel}>Melhor Sequência</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile.totalCompleted}</Text>
              <Text style={styles.statLabel}>Hábitos Feitos</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            onPress={() => setActiveTab('achievements')}
            style={[
              styles.tabBtn,
              activeTab === 'achievements' && styles.tabBtnActive,
            ]}>
            <Ionicons
              name="trophy"
              size={16}
              color={activeTab === 'achievements' ? '#0F172A' : MomentusColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'achievements' && styles.tabTextActive,
              ]}>
              Conquistas ({unlockedCount}/{achievements.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('market')}
            style={[
              styles.tabBtn,
              activeTab === 'market' && styles.tabBtnActive,
            ]}>
            <Ionicons
              name="cart"
              size={16}
              color={activeTab === 'market' ? '#0F172A' : MomentusColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'market' && styles.tabTextActive,
              ]}>
              Loja Momentus
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {activeTab === 'achievements' ? (
            /* Conquistas Tab */
            achievements.map((ach) => {
              const percent = Math.min(
                100,
                Math.round((ach.progress / ach.maxProgress) * 100)
              );
              return (
                <View
                  key={ach.id}
                  style={[
                    styles.itemCard,
                    ach.unlocked && styles.itemCardUnlocked,
                  ]}>
                  <View
                    style={[
                      styles.iconCircle,
                      ach.unlocked
                        ? { backgroundColor: 'rgba(52, 211, 153, 0.2)' }
                        : { backgroundColor: MomentusColors.navyOutline },
                    ]}>
                    <Ionicons
                      name={ach.unlocked ? (ach.icon as any) : 'lock-closed'}
                      size={24}
                      color={ach.unlocked ? MomentusColors.emeraldNeon : MomentusColors.textMuted}
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle}>{ach.title}</Text>
                      {ach.unlocked && (
                        <View style={styles.unlockedTag}>
                          <Text style={styles.unlockedTagText}>Desbloqueado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemDesc}>{ach.description}</Text>

                    {/* Progress */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                      </View>
                      <Text style={styles.progressText}>
                        {ach.progress}/{ach.maxProgress}
                      </Text>
                    </View>

                    {/* Rewards */}
                    <View style={styles.rewardsRow}>
                      <Text style={styles.rewardText}>+{ach.xpReward} XP</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            /* Loja Tab */
            marketItems.map((item) => {
              const rarityColor = getRarityBadgeColor(item.rarity);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${rarityColor}20` },
                    ]}>
                    <Ionicons name={item.iconName as any} size={24} color={rarityColor} />
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
                        <Text style={[styles.rarityText, { color: rarityColor }]}>
                          {item.rarity}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemDesc}>{item.description}</Text>

                    <View style={styles.marketActionRow}>
                      <View style={styles.priceTag}>
                        <Ionicons name="sparkles" size={14} color={MomentusColors.gold} />
                        <Text style={styles.priceText}>{item.finalPrice} XP</Text>
                      </View>

                      <TouchableOpacity
                        disabled={item.isOwned}
                        onPress={() => handleBuy(item)}
                        style={[
                          styles.buyBtn,
                          item.isOwned && styles.purchasedBtn,
                        ]}>
                        <Text
                          style={[
                            styles.buyBtnText,
                            item.isOwned && styles.purchasedBtnText,
                          ]}>
                          {item.isOwned ? 'Adquirido' : 'Resgatar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
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
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 18,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: MomentusColors.emeraldDeep,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLargeText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  titleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  profileLevelText: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  coinsHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  coinsHeaderText: {
    color: MomentusColors.gold,
    fontWeight: 'bold',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: MomentusColors.navyOutline,
    paddingTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: MomentusColors.emeraldNeon,
  },
  tabText: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  itemCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemCardUnlocked: {
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  rarityBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  unlockedTag: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unlockedTagText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: MomentusColors.navyOutline,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: MomentusColors.emeraldNeon,
  },
  progressText: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 11,
    fontWeight: 'bold',
  },
  marketActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: MomentusColors.gold,
    fontSize: 14,
    fontWeight: 'bold',
  },
  buyBtn: {
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  buyBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  purchasedBtn: {
    backgroundColor: MomentusColors.navyOutline,
  },
  purchasedBtnText: {
    color: MomentusColors.textSecondary,
  },
});
