import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors } from '@/constants/theme';
import { GlassCard } from '@/components/momentus/GlassCard';

export default function UpdateNotesScreen() {
  const router = useRouter();

  const updates = [
    {
      icon: 'sparkles' as const,
      title: 'Design System Premium',
      description:
        "Migramos para o tema 'Deep Navy' com Glassmorphism. Uma experiência visual mais limpa, moderna e sofisticada em todas as telas.",
    },
    {
      icon: 'notifications' as const,
      title: 'Feedback Visual Refinado',
      description:
        'Todas as suas ações agora têm confirmações visuais imediatas com o novo PremiumSnackbar, garantindo que você nunca perca o status de uma tarefa ou compra.',
    },
    {
      icon: 'git-network' as const,
      title: 'Timeline Vertical Conectada',
      description:
        'Visualize sua rotina diária como um fluxo contínuo. Melhoramos a legibilidade da agenda com conexões visuais inteligentes.',
    },
    {
      icon: 'phone-portrait' as const,
      title: 'Layout Universal',
      description:
        'O Momentus agora se adapta perfeitamente a qualquer tamanho de tela, de smartphones compactos a tablets e telas dobráveis.',
    },
    {
      icon: 'bag-handle' as const,
      title: 'Momentus Store & Stickers',
      description:
        'Adquira stickers exclusivos com seu XP e use-os para dar personalidade às suas categorias de rotina.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={MomentusColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Novidades</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.mainTitle}>O que há de novo?</Text>

          {/* Versão Pill */}
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>
              Versão 2.1.0 • Store & Personalização
            </Text>
          </View>

          {/* Lista de Novidades */}
          <View style={styles.updatesList}>
            {updates.map((item, index) => (
              <GlassCard key={index} style={styles.updateCard}>
                <View style={styles.cardRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name={item.icon} size={22} color={MomentusColors.emeraldNeon} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.updateItemTitle}>{item.title}</Text>
                    <Text style={styles.updateItemDescription}>{item.description}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* Footer Card */}
          <GlassCard style={styles.footerCard}>
            <View style={styles.footerLogoCircle}>
              <Ionicons name="flame" size={32} color={MomentusColors.emeraldNeon} />
            </View>
            <Text style={styles.footerCardTitle}>Momentus Premium</Text>
            <Text style={styles.footerCardSubtitle}>
              Viva o presente, planeje o futuro.
            </Text>
          </GlassCard>

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
  versionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 24,
  },
  versionBadgeText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 13,
    fontWeight: '800',
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
});
