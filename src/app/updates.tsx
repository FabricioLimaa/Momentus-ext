import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { GlassCard } from '@/components/momentus/GlassCard';

export default function UpdateNotesScreen() {
  const router = useRouter();
  const { theme } = useMomentus();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const updates = [
    {
      icon: 'sparkles' as const,
      title: 'Design System Premium',
      description:
        "Migramos para o tema 'Deep Navy' com Glassmorphism. Uma experiência visual mais limpa, moderna e sofisticada em todas as telas.",
    },
    {
      icon: 'notifications' as const,
      title: 'Notificações Interativas & Lembretes',
      description:
        'Agora você pode concluir ou adiar uma rotina em 15 minutos diretamente pela notificação ou pelo diálogo rápido de lembrete.',
    },
    {
      icon: 'cloud-done' as const,
      title: 'Sincronização Cloud Firestore & SQLite',
      description:
        'Seus hábitos, categorias, templates, conquistas e saldo de XP ficam seguros localmente em SQLite e sincronizados na nuvem.',
    },
    {
      icon: 'git-network' as const,
      title: 'Timeline Vertical Conectada',
      description:
        'Visualize sua rotina diária como um fluxo contínuo. Melhoramos a legibilidade da agenda com conexões visuais inteligentes.',
    },
    {
      icon: 'bag-handle' as const,
      title: 'Momentus Store & Stickers',
      description:
        'Adquira stickers exclusivos com seu XP e use-os para dar personalidade às suas categorias de rotina.',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Novidades</Text>
          <TouchableOpacity
            onPress={() => setShowUpdateDialog(true)}
            style={[styles.checkUpdateBtn, { backgroundColor: `${theme.primary}15` }]}>
            <Ionicons name="cloud-download-outline" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>O que há de novo?</Text>

          {/* Versão Pill */}
          <View style={styles.versionRow}>
            <View style={[styles.versionBadge, { backgroundColor: `${theme.primary}15`, borderColor: theme.primary }]}>
              <Text style={[styles.versionBadgeText, { color: theme.primary }]}>
                Versão 2.1.0 • Paridade Completa
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowUpdateDialog(true)}
              style={[styles.verifyBtn, { borderColor: theme.outline, backgroundColor: theme.surface }]}
              activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={14} color={theme.textPrimary} />
              <Text style={[styles.verifyBtnText, { color: theme.textPrimary }]}>Verificar Versão</Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Novidades */}
          <View style={styles.updatesList}>
            {updates.map((item, index) => (
              <GlassCard key={index} style={styles.updateCard}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}15` }]}>
                    <Ionicons name={item.icon} size={22} color={theme.primary} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={[styles.updateItemTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.updateItemDescription, { color: theme.textSecondary }]}>{item.description}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Footer Card */}
          <GlassCard style={styles.footerCard}>
            <View style={[styles.footerLogoCircle, { backgroundColor: `${theme.primary}15` }]}>
              <Ionicons name="flame" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.footerCardTitle, { color: theme.textPrimary }]}>Momentus Premium</Text>
            <Text style={[styles.footerCardSubtitle, { color: theme.textSecondary }]}>
              Viva o presente, planeje o futuro.
            </Text>
          </GlassCard>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal: UpdateAvailableDialog (espelhando UpdateAvailableDialog.kt) */}
        <Modal
          visible={showUpdateDialog}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUpdateDialog(false)}>
          <View style={styles.dialogOverlay}>
            <View style={[styles.dialogCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <View style={[styles.dialogIconBox, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="sparkles" size={30} color={theme.primary} />
              </View>

              <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>
                Momentus 2.1.0 Ativo!
              </Text>

              <Text style={[styles.dialogDesc, { color: theme.textSecondary }]}>
                O Momentus evoluiu! Você já está utilizando a versão multiplataforma mais recente com sincronização em nuvem, SQLite e notificações interativas.
              </Text>

              <TouchableOpacity
                style={[styles.dialogPrimaryBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowUpdateDialog(false);
                  Alert.alert('Tudo Atualizado! ✨', 'Nenhuma atualização pendente no momento.');
                }}
                activeOpacity={0.85}>
                <Text style={styles.dialogPrimaryBtnText}>EXCELENTE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogDismissBtn}
                onPress={() => setShowUpdateDialog(false)}>
                <Text style={[styles.dialogDismissText, { color: theme.textSecondary }]}>Fechar</Text>
              </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkUpdateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    marginBottom: 10,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  versionBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  versionBadgeText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 13,
    fontWeight: '800',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  updatesList: {
    gap: 12,
    marginBottom: 24,
  },
  updateCard: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  updateItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
    marginBottom: 4,
  },
  updateItemDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: MomentusColors.textSecondary,
  },
  footerCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  footerCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
  },
  footerCardSubtitle: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    marginTop: 4,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  dialogIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  dialogDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  dialogPrimaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialogPrimaryBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  dialogDismissBtn: {
    paddingVertical: 8,
  },
  dialogDismissText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
