import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Image,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  MomentusColors,
  LayoutTokens,
  BorderRadiusTokens,
  TypographyTokens,
} from '@/constants/theme';
import { APP_INFO } from '@/constants/appInfo';
import { useMomentus } from '@/context/MomentusContext';
import { AvatarWithFrame } from '@/components/momentus/AvatarWithFrame';
import { auth as firebaseAuth } from '@/config/firebase';

export default function MoreScreen() {
  const router = useRouter();
  const { userProfile, userLevel, logout, theme, triggerHaptic } = useMomentus();

  const authUser = firebaseAuth.currentUser;
  const displayName =
    userProfile.name && userProfile.name !== 'Usuário'
      ? userProfile.name
      : (authUser?.displayName?.trim() || userProfile.name || 'Usuário');
  const displayEmail = userProfile.email || authUser?.email || '';
  const displayPhoto = userProfile.photoUrl || authUser?.photoURL || null;

  const isCloudConnected = !!authUser;

  const handleLogout = () => {
    triggerHaptic('impact');
    Alert.alert('Sair da Conta', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleShareApp = async () => {
    triggerHaptic('impact');
    const shareMessage = `Estou organizando minha rotina e foco diário com o ${APP_INFO.name}! Experimente você também:\n${APP_INFO.website}`;
    try {
      await Share.share({
        message: shareMessage,
        title: `Conheça o ${APP_INFO.name}`,
      });
    } catch (e) {
      console.warn('Erro ao compartilhar app:', e);
    }
  };

  const handleContactSupport = () => {
    triggerHaptic('impact');
    const subject = encodeURIComponent(`Suporte ${APP_INFO.name} - Usuário: ${displayName}`);
    const body = encodeURIComponent(
      `Olá equipe ${APP_INFO.name},\n\nEstou entrando em contato a respeito do aplicativo:\n\n[Descreva sua dúvida ou problema]\n\nDispositivo: ${Platform.OS}\nVersão: 2.1.0\n`
    );
    Linking.openURL(`mailto:${APP_INFO.email}?subject=${subject}&body=${body}`);
  };

  const handleNavigate = (route: string) => {
    triggerHaptic('selection');
    router.push(route as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Menu & Perfil</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Gerencie seu progresso, ajustes e recursos</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* HERO PROFILE CARD COM MINI DASHBOARD DE KPIS */}
          <View style={[styles.heroProfileCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            {/* Linha Superior: Avatar, Identidade e Status da Nuvem */}
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => handleNavigate('/achievements')}
                activeOpacity={0.8}
                accessibilityLabel="Ver perfil e molduras de avatar">
                <AvatarWithFrame
                  photoUrl={displayPhoto}
                  name={displayName}
                  size={58}
                  frameId={userProfile.selectedAvatarFrame}
                  userLevel={userLevel}
                  totalFocusMinutes={userProfile.focusMinutesToday || 0}
                  currentStreak={userProfile.currentStreak}
                  bestStreak={userProfile.bestStreak}
                />
              </TouchableOpacity>

              <View style={styles.heroIdentityCol}>
                <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                  {displayEmail || APP_INFO.email}
                </Text>

                {/* Status da Nuvem */}
                <View style={styles.cloudStatusRow}>
                  <View
                    style={[
                      styles.cloudStatusDot,
                      { backgroundColor: isCloudConnected ? '#10B981' : '#F59E0B' },
                    ]}
                  />
                  <Text style={[styles.cloudStatusText, { color: theme.textSecondary }]}>
                    {isCloudConnected ? 'Nuvem Conectada' : 'Modo Local / Offline'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Badge de Título Honorário em Destaque */}
            <View style={[styles.honorTitleBadge, { backgroundColor: `${userLevel.rankColor}18`, borderColor: `${userLevel.rankColor}40` }]}>
              <Ionicons name="sparkles" size={13} color={userLevel.rankColor} />
              <Text style={[styles.honorTitleText, { color: userLevel.rankColor }]}>
                {userLevel.rankName}
              </Text>
            </View>

            {/* Trinca de KPIs Rápidos (Mini Dashboard) */}
            <View style={[styles.miniDashboardGrid, { borderTopColor: theme.outline }]}>
              <View style={styles.kpiBox}>
                <View style={styles.kpiIconRow}>
                  <Ionicons name="flame" size={16} color={MomentusColors.fireStreak} />
                  <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
                    {userProfile.currentStreak} dias
                  </Text>
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Streak Atual</Text>
              </View>

              <View style={[styles.kpiDivider, { backgroundColor: theme.outline }]} />

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconRow}>
                  <Ionicons name="timer" size={16} color={theme.primary} />
                  <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
                    {userProfile.focusMinutesToday || 0}m
                  </Text>
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Foco Hoje</Text>
              </View>

              <View style={[styles.kpiDivider, { backgroundColor: theme.outline }]} />

              <View style={styles.kpiBox}>
                <View style={styles.kpiIconRow}>
                  <Ionicons name="star" size={16} color={MomentusColors.gold} />
                  <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
                    {userProfile.totalPoints}
                  </Text>
                </View>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>XP Total</Text>
              </View>
            </View>

            {/* Barra de Progresso de Nível de XP */}
            <View style={styles.levelProgressContainer}>
              <View style={styles.levelProgressHeader}>
                <Text style={[styles.levelProgressTitle, { color: theme.textSecondary }]}>
                  Nível {userLevel.level} • {Math.min(100, Math.round(userLevel.progress * 100))}%
                </Text>
                <Text style={[styles.levelProgressXp, { color: userLevel.rankColor }]}>
                  {userLevel.currentXp} / {userLevel.nextLevelXp} XP
                </Text>
              </View>
              <View style={[styles.levelProgressTrack, { backgroundColor: theme.surfaceElevated }]}>
                <View
                  style={[
                    styles.levelProgressFill,
                    {
                      width: `${Math.min(100, Math.max(5, userLevel.progress * 100))}%`,
                      backgroundColor: userLevel.rankColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* SEÇÃO 1: 📌 ROTINAS & PRODUTIVIDADE */}
          <Text style={[styles.sectionOverline, { color: theme.textSecondary }]}>
            ROTINAS & PRODUTIVIDADE
          </Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={() => handleNavigate('/categories')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(51, 182, 121, 0.15)' }]}>
                  <Ionicons name="folder-outline" size={20} color="#33B679" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Gerenciar Categorias</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Cores da Agenda Google e Metas Semanais</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => handleNavigate('/templates')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="grid-outline" size={20} color={MomentusColors.fireStreak} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Meus Templates</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Galeria de rotinas prontas estilo streaming</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => handleNavigate('/stats')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="stats-chart-outline" size={20} color="#A855F7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Análise de Performance</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Gráficos de consistência e foco semanal</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => handleNavigate('/achievements')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="trophy-outline" size={20} color={MomentusColors.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Conquistas & Loja</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Medalhas, molduras cósmicas e recompensas</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* SEÇÃO 2: ⚙️ PREFERÊNCIAS & SISTEMA */}
          <Text style={[styles.sectionOverline, { color: theme.textSecondary }]}>
            PREFERÊNCIAS & SISTEMA
          </Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={() => handleNavigate('/settings')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.primary}20` }]}>
                  <Ionicons name="settings-outline" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Ajustes & Personalização</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Temas, cartões acordeão, notificações e biometria</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => handleNavigate('/updates')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Ionicons name="sparkles-outline" size={20} color={MomentusColors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Novidades (Versão 2.1.0)</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Timeline histórica e melhorias recentes</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => handleNavigate('/legal')}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(100, 116, 139, 0.15)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Termos & Privacidade</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Resumo TL;DR, DPO e direitos LGPD</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* SEÇÃO 3: 🌐 COMUNIDADE & APOIO */}
          <Text style={[styles.sectionOverline, { color: theme.textSecondary }]}>
            COMUNIDADE & APOIO
          </Text>
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={handleShareApp}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="share-social-outline" size={20} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Indicar o Momentus</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Compartilhe com amigos e colegas</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => Linking.openURL(APP_INFO.website)}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${theme.primary}18` }]}>
                  <Ionicons name="globe-outline" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Conheça Nosso Site Oficial</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>{APP_INFO.domains.official}</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={handleContactSupport}
              style={styles.menuItem}
              activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
                  <Ionicons name="mail-outline" size={20} color="#FB923C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Suporte & Atendimento</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>{APP_INFO.email}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Logout Action */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={MomentusColors.error} />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>

          {/* Assinatura Oficial da Marca */}
          <View style={styles.brandFooterContainer}>
            <Image
              source={
                theme.isDark
                  ? require('@/../assets/images/brand/logo-horizontal-dark-transparent.png')
                  : require('@/../assets/images/brand/logo-horizontal-light-transparent.png')
              }
              style={styles.brandFooterLogo}
              resizeMode="contain"
            />
            <Text style={[styles.brandCreditsText, { color: theme.textSecondary }]}>
              {APP_INFO.name} • Desenvolvido por {APP_INFO.developer}
            </Text>
            <Text style={[styles.brandCopyrightText, { color: theme.textSecondary }]}>
              {APP_INFO.copyright}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${APP_INFO.email}`)} activeOpacity={0.7}>
              <Text style={[styles.brandEmailText, { color: theme.primary }]}>
                {APP_INFO.email}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    marginBottom: 14,
  },
  title: {
    ...TypographyTokens.screenTitle,
  },
  subtitle: {
    ...TypographyTokens.screenSubtitle,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  heroProfileCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIdentityCol: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  cloudStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cloudStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cloudStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  honorTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  honorTitleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  miniDashboardGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  kpiDivider: {
    width: 1,
    height: 24,
  },
  levelProgressContainer: {
    marginTop: 14,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  levelProgressTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  levelProgressXp: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  levelProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    paddingVertical: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    height: 50,
    borderRadius: BorderRadiusTokens.button,
    gap: 8,
    marginTop: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  logoutText: {
    color: MomentusColors.error,
    fontWeight: '800',
    fontSize: 14,
  },
  brandFooterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  brandFooterLogo: {
    width: 170,
    height: 30,
    opacity: 0.9,
  },
  brandCreditsText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  brandCopyrightText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  brandEmailText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
