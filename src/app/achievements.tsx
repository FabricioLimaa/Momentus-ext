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
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getStreakColor } from '@/constants/initialData';
import { Achievement, MarketItem } from '@/types';

export const getIconForAchievement = (id: string): keyof typeof Ionicons.glyphMap => {
  switch (id) {
    case 'FIRST_HABIT':
      return 'rocket';
    case 'FIRST_TEMPLATE':
      return 'sparkles';
    case 'STREAK_3':
      return 'flash';
    case 'STREAK_7':
      return 'star';
    case 'STREAK_30':
      return 'trophy';
    case 'COMPLETED_10':
      return 'checkmark-done';
    case 'COMPLETED_50':
      return 'ribbon';
    case 'COMPLETED_100':
      return 'diamond';
    default:
      return 'star';
  }
};

export default function AchievementsScreen() {
  const {
    achievements,
    marketItems,
    userProfile,
    userLevel,
    buyMarketItem,
    theme,
    showCelebration,
  } = useMomentus();
  const [activeTab, setActiveTab] = useState<'achievements' | 'market'>('achievements');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const handleBuy = (item: MarketItem) => {
    if (item.isOwned) return;
    const success = buyMarketItem(item.id);
    if (success) {
      showCelebration(
        'Item Adquirido! 🛍️',
        `Você comprou "${item.name}". Aproveite seu novo item!`,
        0
      );
    } else {
      Alert.alert(
        'XP Insuficiente! ⭐',
        `Você precisa de ${item.finalPrice} XP para adquirir este item. Complete mais hábitos e blocos de foco para acumular pontos!`
      );
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const getRarityColor = (rarity: string) => {
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* User Profile Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.surface, borderColor: theme.outline },
          ]}>
          <View style={styles.profileTopRow}>
            <View style={[styles.avatarLarge, { borderColor: userLevel.rankColor }]}>
              <Text style={styles.avatarLargeText}>
                {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>

            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                {userProfile.name || 'Usuário'}
              </Text>
              <View style={styles.levelRankRow}>
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: `${theme.primary}20` },
                  ]}>
                  <Text style={[styles.levelBadgeText, { color: theme.primary }]}>
                    Nível {userLevel.level}
                  </Text>
                </View>
                <Text style={styles.rankNameText}>{userLevel.rankName}</Text>
              </View>
            </View>

            <View style={styles.xpBadgeBox}>
              <Ionicons name="sparkles" size={15} color={MomentusColors.gold} />
              <Text style={styles.xpBadgeText}>{userProfile.totalPoints} XP</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons
                  name="flame"
                  size={18}
                  color={getStreakColor(userProfile.currentStreak)}
                />
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                  {userProfile.currentStreak} dias
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Dias seguidos</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.outline }]} />

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="star" size={18} color="#D4AF37" />
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                  {userProfile.totalPoints}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pontos totais</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: theme.outline }]} />

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="checkmark-done" size={18} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                  {userProfile.totalCompleted}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Hábitos concluídos</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher: Conquistas / Loja */}
        <View
          style={[
            styles.tabSwitcher,
            { backgroundColor: theme.surface, borderColor: theme.outline },
          ]}>
          <TouchableOpacity
            onPress={() => setActiveTab('achievements')}
            style={[
              styles.tabBtn,
              activeTab === 'achievements' && { backgroundColor: theme.primary },
            ]}
            activeOpacity={0.7}>
            <Ionicons
              name="trophy"
              size={16}
              color={activeTab === 'achievements' ? '#000000' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'achievements' ? '#000000' : theme.textSecondary },
                activeTab === 'achievements' && { fontWeight: '800' },
              ]}>
              Medalhas ({unlockedCount}/{achievements.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('market')}
            style={[
              styles.tabBtn,
              activeTab === 'market' && { backgroundColor: theme.primary },
            ]}
            activeOpacity={0.7}>
            <Ionicons
              name="cart"
              size={16}
              color={activeTab === 'market' ? '#000000' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'market' ? '#000000' : theme.textSecondary },
                activeTab === 'market' && { fontWeight: '800' },
              ]}>
              Loja de Stickers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo das Abas */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {activeTab === 'achievements' ? (
            /* Lista de Medalhas */
            achievements.map((ach) => {
              const icon = getIconForAchievement(ach.id);
              const percent = Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100));

              return (
                <TouchableOpacity
                  key={ach.id}
                  onPress={() => setSelectedAchievement(ach)}
                  style={[styles.itemCard, ach.unlocked && styles.itemCardUnlocked]}
                  activeOpacity={0.75}>
                  <View
                    style={[
                      styles.iconCircle,
                      ach.unlocked
                        ? { backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: MomentusColors.emeraldNeon }
                        : { backgroundColor: MomentusColors.navyOutline, borderColor: 'transparent' },
                    ]}>
                    <Ionicons
                      name={ach.unlocked ? icon : 'lock-closed'}
                      size={24}
                      color={ach.unlocked ? MomentusColors.emeraldNeon : MomentusColors.textSecondary}
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle}>{ach.title}</Text>
                      {ach.unlocked ? (
                        <View style={styles.unlockedTag}>
                          <Text style={styles.unlockedTagText}>Desbloqueado</Text>
                        </View>
                      ) : (
                        <Text style={styles.lockedRewardText}>+{ach.xpReward} XP</Text>
                      )}
                    </View>

                    <Text style={styles.itemDesc}>{ach.description}</Text>

                    {/* Progress Bar */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                      </View>
                      <Text style={styles.progressText}>
                        {ach.progress}/{ach.maxProgress}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            /* Loja de Stickers / Badges */
            marketItems.map((item) => {
              const rarityColor = getRarityColor(item.rarity);

              return (
                <View key={item.id} style={styles.itemCard}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${rarityColor}20`, borderColor: rarityColor },
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
                        ]}
                        activeOpacity={0.8}>
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

        {/* Diálogo de Detalhes da Conquista */}
        <Modal
          visible={!!selectedAchievement}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedAchievement(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {selectedAchievement && (
                <>
                  <View style={styles.modalIconWrap}>
                    <View
                      style={[
                        styles.modalIconCircle,
                        selectedAchievement.unlocked
                          ? { backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: MomentusColors.emeraldNeon }
                          : { backgroundColor: MomentusColors.navyOutline, borderColor: 'transparent' },
                      ]}>
                      <Ionicons
                        name={selectedAchievement.unlocked ? getIconForAchievement(selectedAchievement.id) : 'lock-closed'}
                        size={36}
                        color={selectedAchievement.unlocked ? MomentusColors.emeraldNeon : MomentusColors.textSecondary}
                      />
                    </View>
                  </View>

                  <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
                  <Text style={styles.modalSubtitle}>{selectedAchievement.description}</Text>

                  <View style={styles.modalRewardBox}>
                    <Text style={styles.modalRewardLabel}>Recompensa</Text>
                    <Text style={styles.modalRewardValue}>+{selectedAchievement.xpReward} XP</Text>
                  </View>

                  <View style={styles.modalStatusBox}>
                    <Text style={styles.modalStatusText}>
                      {selectedAchievement.unlocked
                        ? `Conquistada em ${selectedAchievement.unlockedAt || 'Recentemente'}`
                        : `Progresso: ${selectedAchievement.progress} de ${selectedAchievement.maxProgress}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedAchievement(null)}
                    activeOpacity={0.85}>
                    <Text style={styles.modalCloseBtnText}>Fechar</Text>
                  </TouchableOpacity>
                </>
              )}
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
  profileName: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelBadgeText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 11,
    fontWeight: '800',
  },
  rankNameText: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
  },
  xpBadgeBox: {
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
  xpBadgeText: {
    color: MomentusColors.gold,
    fontWeight: '800',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: MomentusColors.navyOutline,
    paddingTop: 14,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    color: MomentusColors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: MomentusColors.navyOutline,
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
    borderWidth: 1.5,
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
  lockedRewardText: {
    color: MomentusColors.gold,
    fontSize: 11,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrap: {
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  modalRewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  modalRewardLabel: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    fontWeight: '600',
  },
  modalRewardValue: {
    fontSize: 14,
    fontWeight: '800',
    color: MomentusColors.gold,
  },
  modalStatusBox: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalStatusText: {
    fontSize: 12,
    color: MomentusColors.emeraldNeon,
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: MomentusColors.emeraldNeon,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
});
