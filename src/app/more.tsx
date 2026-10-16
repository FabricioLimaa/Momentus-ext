import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { CategoriesModal } from '@/components/momentus/CategoriesModal';
import { SettingsModal } from '@/components/momentus/SettingsModal';

export default function MoreScreen() {
  const router = useRouter();
  const { userProfile, userLevel, logout, theme } = useMomentus();
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sair da Conta', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Menu & Perfil</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Gerencie configurações e recursos avançados</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* User Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={[styles.avatar, { borderColor: userLevel.rankColor }]}>
              <Text style={styles.avatarText}>{userProfile.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>{userProfile.name}</Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{userProfile.email}</Text>
              <View style={[styles.rankBadge, { backgroundColor: `${userLevel.rankColor}20` }]}>
                <Ionicons name="sparkles" size={12} color={userLevel.rankColor} />
                <Text style={[styles.rankText, { color: userLevel.rankColor }]}>
                  Nível {userLevel.level} • {userLevel.rankName}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items List */}
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={() => setCategoriesModalVisible(true)}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(51, 182, 121, 0.15)' }]}>
                  <Ionicons name="folder-outline" size={20} color="#33B679" />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Gerenciar Categorias</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Cores da Agenda Google e Metas</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => router.push('/templates')}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="grid-outline" size={20} color={MomentusColors.fireStreak} />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Modelos de Rotina</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Templates prontos para o seu dia</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => router.push('/achievements')}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="trophy-outline" size={20} color={MomentusColors.cyan} />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Conquistas & Loja</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Troféus e itens virtuais</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => router.push('/stats')}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="stats-chart-outline" size={20} color="#A855F7" />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Análise de Performance</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Métricas semanais e evolução</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Preferences Group */}
          <View style={[styles.menuGroup, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={() => router.push('/settings' as any)}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Ionicons name="settings-outline" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Ajustes & Personalização</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Tema, áudio, sincronização e backup</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => router.push('/updates' as any)}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Ionicons name="sparkles-outline" size={20} color={MomentusColors.gold} />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Novidades (Versão 2.1.0)</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>O que há de novo no Momentus</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              onPress={() => router.push('/legal' as any)}
              style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(100, 116, 139, 0.15)' }]}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.menuItemTitle, { color: theme.textPrimary }]}>Termos & Privacidade</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>Informações legais do aplicativo</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Logout Action */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={MomentusColors.error} />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        <CategoriesModal
          visible={categoriesModalVisible}
          onClose={() => setCategoriesModalVisible(false)}
        />

        <SettingsModal
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
        />
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  profileCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: MomentusColors.emeraldDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  menuGroup: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingVertical: 6,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    color: MomentusColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemSub: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: MomentusColors.navyOutline,
    marginLeft: 68,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 18,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: MomentusColors.error,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

