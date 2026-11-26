import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMomentus } from '@/context/MomentusContext';
import {
  SpacingTokens,
  BorderRadiusTokens,
  IconSize,
  LayoutTokens,
} from '@/constants/theme';
import { AvatarWithFrame } from '@/components/momentus/AvatarWithFrame';
import { APP_INFO } from '@/constants/appInfo';
import { auth as firebaseAuth } from '@/config/firebase';

interface DesktopSidebarProps {
  activePath: string;
  isCompact?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Hoje',
    path: '/home',
    iconActive: 'today',
    iconInactive: 'today-outline',
  },
  {
    id: 'calendar',
    label: 'Agenda',
    path: '/calendar',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  {
    id: 'focus',
    label: 'Foco',
    path: '/focus',
    iconActive: 'timer',
    iconInactive: 'timer-outline',
  },
  {
    id: 'stats',
    label: 'Estatísticas',
    path: '/stats',
    iconActive: 'stats-chart',
    iconInactive: 'stats-chart-outline',
  },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'templates',
    label: 'Templates',
    path: '/templates',
    iconActive: 'copy',
    iconInactive: 'copy-outline',
  },
  {
    id: 'categories',
    label: 'Categorias',
    path: '/categories',
    iconActive: 'folder',
    iconInactive: 'folder-outline',
  },
  {
    id: 'achievements',
    label: 'Conquistas',
    path: '/achievements',
    iconActive: 'trophy',
    iconInactive: 'trophy-outline',
  },
];

const SYSTEM_NAV_ITEMS: NavItem[] = [
  {
    id: 'settings',
    label: 'Ajustes',
    path: '/settings',
    iconActive: 'settings',
    iconInactive: 'settings-outline',
  },
  {
    id: 'more',
    label: 'Mais & Perfil',
    path: '/more',
    iconActive: 'menu',
    iconInactive: 'menu-outline',
  },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activePath,
  isCompact = false,
}) => {
  const router = useRouter();
  const { theme, userProfile, userLevel, focusHistoryMap } = useMomentus();
  const totalFocusMinutesAllTime = React.useMemo(
    () =>
      Math.max(
        userProfile.focusMinutesToday || 0,
        Object.values(focusHistoryMap || {}).reduce((acc, m) => acc + (m > 0 ? m : 0), 0)
      ),
    [focusHistoryMap, userProfile.focusMinutesToday]
  );
  const authUser = firebaseAuth?.currentUser;
  const isCloudConnected = !!authUser;
  const displayName = userProfile.name?.trim() || authUser?.displayName?.trim() || 'Meu Espaço';
  const displayPhoto = userProfile.photoUrl || authUser?.photoURL || null;

  const handleNavigate = (path: string) => {
    if (activePath === path) return;
    router.replace(path as any);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive =
      activePath === item.path ||
      (item.path === '/home' && activePath === '/');
    const iconName = isActive ? item.iconActive : item.iconInactive;

    return (
      <Pressable
        key={item.id}
        onPress={() => handleNavigate(item.path)}
        {...(Platform.OS === 'web'
          ? ({
              cursor: 'pointer',
              accessibilityRole: 'link',
              title: isCompact ? item.label : undefined,
            } as any)
          : {})}
        style={({ hovered }: any) => [
          styles.navItem,
          isCompact && styles.navItemCompact,
          isActive && {
            backgroundColor: `${theme.primary}18`,
          },
          hovered &&
            !isActive && {
              backgroundColor: theme.isDark
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(0, 0, 0, 0.04)',
            },
        ]}>
        {/* Barra ativa lateral à esquerda */}
        {isActive && (
          <View
            style={[
              styles.activeIndicator,
              { backgroundColor: theme.primary },
            ]}
          />
        )}

        <Ionicons
          name={iconName}
          size={IconSize.md}
          color={isActive ? theme.primary : theme.textSecondary}
          style={!isCompact ? styles.navIcon : undefined}
        />

        {!isCompact && (
          <Text
            numberOfLines={1}
            style={[
              styles.navLabel,
              {
                color: isActive ? theme.primary : theme.textPrimary,
                fontWeight: isActive ? '700' : '500',
              },
            ]}>
            {item.label}
          </Text>
        )}

        {!isCompact && item.badge && (
          <View
            style={[
              styles.badgeContainer,
              { backgroundColor: `${theme.primary}25` },
            ]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              {item.badge}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        isCompact
          ? { width: LayoutTokens.sidebarCompactWidth }
          : { width: LayoutTokens.sidebarWidth },
        {
          backgroundColor: theme.surface,
          borderRightColor: theme.outline,
        },
      ]}>
      {/* 1. Topo: Logo & Branding Oficial */}
      <View
        style={[
          styles.header,
          isCompact && styles.headerCompact,
        ]}>
        <Image
          source={require('@/../assets/images/brand/symbol-transparent.png')}
          style={styles.logoSymbol}
          resizeMode="contain"
        />
        {!isCompact && (
          <View style={styles.brandTitleCol}>
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
              {APP_INFO.name}
            </Text>
            <Text style={[styles.brandVersion, { color: theme.textSecondary }]}>
              v2.1.0 • Zen
            </Text>
          </View>
        )}
      </View>

      {/* 2. Lista de Navegação */}
      <View style={styles.navSectionsContainer}>
        {/* Seção Principal */}
        <View style={styles.sectionGroup}>
          {PRIMARY_NAV_ITEMS.map(renderNavItem)}
        </View>

        {/* Divisória / Seção Secundária */}
        <View style={styles.sectionGroup}>
          {!isCompact && (
            <Text style={[styles.sectionOverline, { color: theme.textSecondary }]}>
              PRODUTIVIDADE
            </Text>
          )}
          {SECONDARY_NAV_ITEMS.map(renderNavItem)}
        </View>

        {/* Seção de Sistema */}
        <View style={styles.sectionGroup}>
          {!isCompact && (
            <Text style={[styles.sectionOverline, { color: theme.textSecondary }]}>
              SISTEMA
            </Text>
          )}
          {SYSTEM_NAV_ITEMS.map(renderNavItem)}
        </View>
      </View>

      {/* 3. Rodapé: Mini Perfil do Usuário & Status da Nuvem */}
      <Pressable
        onPress={() => handleNavigate('/more')}
        {...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {})}
        style={({ hovered }: any) => [
          styles.footerUserCard,
          isCompact && styles.footerUserCardCompact,
          { borderTopColor: theme.outline },
          hovered && {
            backgroundColor: theme.isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.04)',
          },
        ]}>
        <AvatarWithFrame
          photoUrl={displayPhoto}
          name={displayName}
          size={isCompact ? 36 : 40}
          frameId={userProfile.selectedAvatarFrame}
          userLevel={userLevel}
          totalFocusMinutes={totalFocusMinutesAllTime}
          currentStreak={userProfile.currentStreak || 0}
          bestStreak={userProfile.bestStreak || 0}
        />

        {!isCompact && (
          <View style={styles.userInfoTextCol}>
            <Text
              numberOfLines={1}
              style={[styles.userNameText, { color: theme.textPrimary }]}>
              {displayName}
            </Text>
            <View style={styles.cloudStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isCloudConnected ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text
                numberOfLines={1}
                style={[styles.cloudStatusText, { color: theme.textSecondary }]}>
                {isCloudConnected ? 'Nuvem Conectada' : 'Modo Local'}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.md,
    paddingTop: SpacingTokens.lg,
    paddingBottom: SpacingTokens.md,
    gap: SpacingTokens.sm,
  },
  headerCompact: {
    justifyContent: 'center',
    paddingHorizontal: SpacingTokens.xs,
  },
  logoSymbol: {
    width: 32,
    height: 32,
  },
  brandTitleCol: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandVersion: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  navSectionsContainer: {
    flex: 1,
    paddingVertical: SpacingTokens.sm,
    gap: SpacingTokens.md,
  },
  sectionGroup: {
    gap: SpacingTokens.xs,
  },
  sectionOverline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: SpacingTokens.md + SpacingTokens.xs,
    marginBottom: SpacingTokens.xs,
  },
  navItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.sm + SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.control,
    position: 'relative',
  },
  navItemCompact: {
    justifyContent: 'center',
    marginHorizontal: SpacingTokens.xs,
    paddingHorizontal: 0,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: SpacingTokens.sm,
    bottom: SpacingTokens.sm,
    width: 3,
    borderRadius: 2,
  },
  navIcon: {
    marginRight: SpacingTokens.sm,
  },
  navLabel: {
    fontSize: 13,
    letterSpacing: -0.2,
    flex: 1,
  },
  badgeContainer: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  footerUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.md,
    gap: SpacingTokens.sm,
  },
  footerUserCardCompact: {
    justifyContent: 'center',
    paddingHorizontal: SpacingTokens.xs,
  },
  userInfoTextCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cloudStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cloudStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
