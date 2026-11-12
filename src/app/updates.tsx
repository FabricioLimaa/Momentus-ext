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
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  getContrastTextColor,
  LayoutTokens,
  BorderRadiusTokens,
} from '@/constants/theme';
import { APP_INFO } from '@/constants/appInfo';
import { useMomentus } from '@/context/MomentusContext';

export type UpdateTagType = 'NOVO' | 'MELHORIA' | 'DESIGN' | 'SEGURANCA' | 'CORRECAO';

export interface UpdateItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tag: UpdateTagType;
  title: string;
  description: string;
  actionRoute?: string;
  actionLabel?: string;
}

export interface VersionRelease {
  version: string;
  codename: string;
  date: string;
  isCurrent: boolean;
  highlights: string;
  items: UpdateItem[];
}

export const CHANGELOG_DATA: VersionRelease[] = [
  {
    version: '2.1.0',
    codename: 'Evolução, Foco & Imersão',
    date: 'Novembro de 2026',
    isCurrent: true,
    highlights: 'Timer Pomodoro profundo, Galeria de templates estilo Netflix, Gamificação com molduras cósmicas e proteção biométrica.',
    items: [
      {
        id: 'feat-focus',
        icon: 'timer-outline',
        tag: 'NOVO',
        title: 'Timer Pomodoro Imersivo com Sons & Metas',
        description: 'Treine seu foco profundo com ciclos customizáveis (15m a 60m), metas diárias de foco e alertas suaves de transição.',
        actionRoute: '/focus',
        actionLabel: 'Experimentar Foco →',
      },
      {
        id: 'feat-templates',
        icon: 'sparkles-outline',
        tag: 'NOVO',
        title: 'Galeria de Templates "Estilo Netflix"',
        description: 'Adote rotinas consagradas de alta performance com 1 toque através de trilhas horizontais de manhã, estudos, saúde e desaceleração.',
        actionRoute: '/templates',
        actionLabel: 'Explorar Templates →',
      },
      {
        id: 'feat-gamification',
        icon: 'trophy-outline',
        tag: 'MELHORIA',
        title: 'Títulos Honorários, Tiers & Molduras Cósmicas',
        description: 'Seu progresso de XP agora desbloqueia molduras de avatar neon, títulos de prestígio e novos tiers de medalhas.',
        actionRoute: '/achievements',
        actionLabel: 'Ver Conquistas →',
      },
      {
        id: 'feat-categories',
        icon: 'color-palette-outline',
        tag: 'DESIGN',
        title: 'Paleta Neon Expandida & Catálogo de Ícones',
        description: 'Mais de 18 novos ícones universais e 12 cores neon para organizar suas categorias com visualização ao vivo no editor.',
        actionRoute: '/categories',
        actionLabel: 'Personalizar Categorias →',
      },
      {
        id: 'feat-security',
        icon: 'finger-print-outline',
        tag: 'SEGURANCA',
        title: 'Bloqueio Biométrico por Face ID & Digital',
        description: 'Camada de proteção extra para blindar sua privacidade e exigir confirmação biométrica ao abrir o Momentus.',
        actionRoute: '/settings',
        actionLabel: 'Configurar Ajustes →',
      },
      {
        id: 'fix-sync',
        icon: 'cloud-done-outline',
        tag: 'CORRECAO',
        title: 'Resiliência Offline & Timeout na Sincronização',
        description: 'Sincronização manual protegida com limite estrito de 8 segundos, prevenindo bloqueios de tela caso a internet oscile.',
      },
    ],
  },
  {
    version: '2.0.0',
    codename: 'Salto Visual, Cloud & Agenda',
    date: 'Outubro de 2026',
    isCurrent: false,
    highlights: 'Sincronização bilateral com o Google Calendar, persistência em Cloud Firestore e SQLite local em repouso.',
    items: [
      {
        id: 'feat-gcal',
        icon: 'calendar-outline',
        tag: 'NOVO',
        title: 'Sincronização com o Google Calendar',
        description: 'Seus hábitos e rotinas sincronizados diretamente com seu calendário oficial sem duplicidade.',
      },
      {
        id: 'feat-cloud-sync',
        icon: 'cloud-upload-outline',
        tag: 'MELHORIA',
        title: 'Arquitetura Híbrida Offline-First',
        description: 'Seus dados funcionam 100% offline no celular e sincronizam automaticamente na nuvem ao restabelecer a conexão.',
      },
      {
        id: 'feat-glass-design',
        icon: 'eye-outline',
        tag: 'DESIGN',
        title: 'Design System Zen com Glassmorphism',
        description: 'Superfícies em vidro fosco translúcido e ergonomia mobile de ponta a ponta.',
      },
    ],
  },
  {
    version: '1.9.0',
    codename: 'Fundamentos de Hábitos & Streaks',
    date: 'Setembro de 2026',
    isCurrent: false,
    highlights: 'Rastreamento contínuo de hábitos, cálculo automático de sequências (streaks) e relatórios de produtividade.',
    items: [
      {
        id: 'feat-streaks',
        icon: 'flame-outline',
        tag: 'NOVO',
        title: 'Cálculo Dinâmico de Streaks & Dias Conquistados',
        description: 'Acompanhe quantos dias seguidos você manteve sua consistência diária e ganhe bônus de XP.',
      },
      {
        id: 'feat-stats',
        icon: 'bar-chart-outline',
        tag: 'MELHORIA',
        title: 'Gráficos e Estatísticas de Produtividade',
        description: 'Visão clara dos hábitos mais consistentes da semana com taxa percentual de sucesso.',
      },
    ],
  },
];

export default function UpdateNotesScreen() {
  const router = useRouter();
  const { theme, triggerHaptic } = useMomentus();

  const [activeFilter, setActiveFilter] = useState<'ALL' | UpdateTagType>('ALL');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);

  const getTagBadgeStyle = (tag: UpdateTagType) => {
    switch (tag) {
      case 'NOVO':
        return { bg: `${theme.primary}20`, border: theme.primary, text: theme.primary, label: '✨ NOVO' };
      case 'MELHORIA':
        return { bg: 'rgba(56, 189, 248, 0.15)', border: '#38BDF8', text: '#38BDF8', label: '⚡ MELHORIA' };
      case 'DESIGN':
        return { bg: 'rgba(168, 85, 247, 0.15)', border: '#A855F7', text: '#A855F7', label: '🎨 DESIGN' };
      case 'SEGURANCA':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', text: '#F59E0B', label: '🔒 SEGURANÇA' };
      case 'CORRECAO':
        return { bg: 'rgba(251, 113, 133, 0.15)', border: '#FB7185', text: '#FB7185', label: '🐛 CORREÇÃO' };
      default:
        return { bg: `${theme.textSecondary}15`, border: theme.outline, text: theme.textSecondary, label: tag };
    }
  };

  const handleShareUpdates = async () => {
    triggerHaptic('impact');
    const shareMessage = [
      `✨ Confira as novidades do ${APP_INFO.name} (Versão 2.1.0)!`,
      '',
      '• ⏱️ Novo Timer Pomodoro profundo com metas diárias',
      '• 🎬 Galeria de Rotinas estilo streaming (1-toque)',
      '• 🏆 Títulos honorários, molduras cósmicas e medalhas',
      '• 🔒 Bloqueio biométrico por Face ID ou Digital',
      '• ☁️ Sincronização offline-first com Google Calendar',
      '',
      `Conheça e experimente no site oficial: ${APP_INFO.website}`,
    ].join('\n');

    try {
      await Share.share({
        message: shareMessage,
        title: `Novidades ${APP_INFO.name} 2.1.0`,
      });
    } catch (e) {
      console.warn('Erro ao compartilhar changelog:', e);
    }
  };

  const handleCheckVersion = () => {
    triggerHaptic('impact');
    setIsCheckingVersion(true);

    setTimeout(() => {
      setIsCheckingVersion(false);
      triggerHaptic('success');
      setShowUpdateDialog(true);
    }, 1200);
  };

  const handleSendFeedback = () => {
    triggerHaptic('impact');
    const subject = encodeURIComponent(`Sugestão para o ${APP_INFO.name} v2.1.0`);
    const body = encodeURIComponent(
      `Olá ${APP_INFO.developer},\n\nGostaria de sugerir o seguinte recurso para a próxima versão do Momentus:\n\n[Descreva sua ideia aqui]\n\nObrigado!\n`
    );
    Linking.openURL(`mailto:${APP_INFO.email}?subject=${subject}&body=${body}`);
  };

  const handleReportBug = () => {
    triggerHaptic('impact');
    const subject = encodeURIComponent(`Relato de Problema - ${APP_INFO.name} v2.1.0`);
    const body = encodeURIComponent(
      `Olá ${APP_INFO.developer},\n\nIdentifiquei a seguinte questão no aplicativo:\n\n[Descreva o problema observado]\n\nDispositivo: ${Platform.OS}\n`
    );
    Linking.openURL(`mailto:${APP_INFO.email}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Novidades</Text>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              onPress={handleShareUpdates}
              style={[styles.topBarBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar novidades">
              <Ionicons name="share-social-outline" size={18} color={theme.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCheckVersion}
              disabled={isCheckingVersion}
              style={[styles.topBarBtn, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Verificar atualização">
              {isCheckingVersion ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={18} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Banner de Versão Atual com Brilho Neon */}
          <View style={[styles.versionBannerCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
            <View style={styles.versionBannerTop}>
              <View style={[styles.versionBadge, { backgroundColor: `${theme.primary}25`, borderColor: theme.primary }]}>
                <Ionicons name="sparkles" size={14} color={theme.primary} />
                <Text style={[styles.versionBadgeText, { color: theme.primary }]}>
                  Versão {Constants.expoConfig?.version || '2.1.0'} • Oficial
                </Text>
              </View>
              <Text style={[styles.releaseDateText, { color: theme.textSecondary }]}>Novembro de 2026</Text>
            </View>

            <Text style={[styles.bannerTitle, { color: theme.textPrimary }]}>
              Evolução, Foco & Imersão ✨
            </Text>
            <Text style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
              {CHANGELOG_DATA[0].highlights}
            </Text>

            <View style={[styles.bannerVerifyRow, { borderTopColor: theme.outline }]}>
              <TouchableOpacity
                onPress={handleCheckVersion}
                style={[styles.verifyBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                activeOpacity={0.8}>
                <Ionicons name="checkmark-circle-outline" size={15} color={theme.primary} />
                <Text style={[styles.verifyBtnText, { color: theme.textPrimary }]}>
                  {isCheckingVersion ? 'Verificando...' : 'Verificar Atualizações'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filtros Rápidos por Pílula */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
            style={styles.filtersScrollView}>
            {[
              { id: 'ALL' as const, label: 'Todas' },
              { id: 'NOVO' as const, label: '✨ Recursos' },
              { id: 'MELHORIA' as const, label: '⚡ Melhorias' },
              { id: 'DESIGN' as const, label: '🎨 Design' },
              { id: 'SEGURANCA' as const, label: '🔒 Segurança' },
              { id: 'CORRECAO' as const, label: '🐛 Correções' },
            ].map((pill) => {
              const isSelected = activeFilter === pill.id;
              return (
                <TouchableOpacity
                  key={pill.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? `${theme.primary}25` : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.outline,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setActiveFilter(pill.id);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? theme.primary : theme.textSecondary },
                      isSelected && { fontWeight: '800' },
                    ]}>
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Linha do Tempo Histórica do Changelog */}
          <View style={styles.timelineContainer}>
            {CHANGELOG_DATA.map((release) => {
              const filteredItems = release.items.filter(
                (item) => activeFilter === 'ALL' || item.tag === activeFilter
              );

              if (filteredItems.length === 0) return null;

              return (
                <View key={release.version} style={styles.releaseSection}>
                  {/* Cabeçalho da Versão na Timeline */}
                  <View style={styles.releaseHeaderRow}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: release.isCurrent ? theme.primary : theme.surfaceElevated,
                          borderColor: release.isCurrent ? theme.primary : theme.outline,
                        },
                      ]}>
                      <Ionicons
                        name={release.isCurrent ? 'star' : 'ellipse'}
                        size={release.isCurrent ? 12 : 8}
                        color={release.isCurrent ? '#0F172A' : theme.textSecondary}
                      />
                    </View>

                    <View style={styles.releaseHeaderTitleCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.releaseVersionTitle, { color: theme.textPrimary }]}>
                          v{release.version}
                        </Text>
                        <Text style={[styles.releaseCodename, { color: release.isCurrent ? theme.primary : theme.textSecondary }]}>
                          {release.codename}
                        </Text>
                      </View>
                      <Text style={[styles.releaseDateSmall, { color: theme.textSecondary }]}>
                        {release.date}
                      </Text>
                    </View>
                  </View>

                  {/* Itens de Novidade da Versão com Linha Conectora Vertical */}
                  <View style={styles.itemsWrapperWithLine}>
                    {/* Linha Vertical Luminosa */}
                    <View
                      style={[
                        styles.verticalTimelineLine,
                        { backgroundColor: release.isCurrent ? `${theme.primary}50` : theme.outline },
                      ]}
                    />

                    <View style={styles.itemsListCol}>
                      {filteredItems.map((item) => {
                        const badgeStyle = getTagBadgeStyle(item.tag);
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.updateCard,
                              { backgroundColor: theme.surface, borderColor: theme.outline },
                              release.isCurrent && item.tag === 'NOVO' && { borderColor: `${theme.primary}40` },
                            ]}>
                            <View style={styles.cardHeaderRow}>
                              <View style={[styles.iconCircle, { backgroundColor: badgeStyle.bg }]}>
                                <Ionicons name={item.icon} size={20} color={badgeStyle.text} />
                              </View>

                              <View style={{ flex: 1 }}>
                                <View style={styles.cardTitleTop}>
                                  <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>
                                    {item.title}
                                  </Text>
                                  <View
                                    style={[
                                      styles.tagBadge,
                                      { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
                                    ]}>
                                    <Text style={[styles.tagBadgeText, { color: badgeStyle.text }]}>
                                      {badgeStyle.label}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.itemDescription, { color: theme.textSecondary }]}>
                                  {item.description}
                                </Text>
                              </View>
                            </View>

                            {/* Ação Rápida de Deep Link ("Experimentar Agora") */}
                            {item.actionRoute && (
                              <TouchableOpacity
                                style={[styles.actionTourBtn, { backgroundColor: `${theme.primary}15` }]}
                                onPress={() => {
                                  triggerHaptic('impact');
                                  router.push(item.actionRoute as any);
                                }}
                                activeOpacity={0.8}>
                                <Text style={[styles.actionTourBtnText, { color: theme.primary }]}>
                                  {item.actionLabel || 'Experimentar Agora →'}
                                </Text>
                                <Ionicons name="arrow-forward" size={13} color={theme.primary} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Canal de Sugestões & Feedback da Comunidade */}
          <View style={[styles.feedbackCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={[styles.feedbackIconCircle, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name="bulb-outline" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.feedbackTitle, { color: theme.textPrimary }]}>
              Tem uma ideia para a próxima versão?
            </Text>
            <Text style={[styles.feedbackSubtitle, { color: theme.textSecondary }]}>
              O {APP_INFO.name} evolui com você. Conte para a nossa equipe qual recurso tornaria a sua rotina ainda mais produtiva e tranquila.
            </Text>

            <TouchableOpacity
              style={[styles.feedbackBtn, { backgroundColor: theme.primary }]}
              onPress={handleSendFeedback}
              activeOpacity={0.85}>
              <Ionicons name="mail" size={16} color={getContrastTextColor(theme.primary)} />
              <Text style={[styles.feedbackBtnText, { color: getContrastTextColor(theme.primary) }]}>
                Enviar Minha Sugestão 💡
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reportBugBtn, { borderColor: theme.outline, backgroundColor: theme.surfaceElevated }]}
              onPress={handleReportBug}
              activeOpacity={0.8}>
              <Ionicons name="bug-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.reportBugBtnText, { color: theme.textSecondary }]}>
                Relatar um Problema 🐛
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rodapé Institucional */}
          <View style={styles.footerBrand}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              {APP_INFO.name} • Desenvolvido por {APP_INFO.developer}
            </Text>
            <Text style={[styles.footerCopyright, { color: theme.textSecondary }]}>
              {APP_INFO.copyright}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(APP_INFO.website)} activeOpacity={0.7}>
              <Text style={[styles.footerUrl, { color: theme.primary }]}>
                {APP_INFO.domains.official}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Modal de Status de Versão Recente */}
        <Modal
          visible={showUpdateDialog}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUpdateDialog(false)}>
          <View style={styles.dialogOverlay}>
            <View style={[styles.dialogCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <View style={[styles.dialogIconBox, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="checkmark-done" size={32} color={theme.primary} />
              </View>

              <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>
                Você está atualizado! 🎉
              </Text>

              <Text style={[styles.dialogDesc, { color: theme.textSecondary }]}>
                O {APP_INFO.name} está na versão mais recente (v2.1.0). Todos os recursos de Pomodoro, galeria de rotinas e biometria estão 100% ativos e seguros no seu dispositivo.
              </Text>

              <TouchableOpacity
                style={[styles.dialogPrimaryBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowUpdateDialog(false)}
                activeOpacity={0.85}>
                <Text style={[styles.dialogPrimaryBtnText, { color: getContrastTextColor(theme.primary) }]}>
                  EXCELENTE
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogSecondaryBtn, { borderColor: theme.outline, backgroundColor: theme.surfaceElevated, marginTop: 8 }]}
                onPress={() => {
                  const url = Platform.OS === 'ios'
                    ? 'itms-apps://itunes.apple.com/app/id6742055620'
                    : 'market://details?id=br.com.fabriciolima.momentus';
                  Linking.openURL(url).catch(() => Linking.openURL(APP_INFO.website));
                }}
                activeOpacity={0.8}>
                <Ionicons name="logo-google-playstore" size={15} color={theme.primary} />
                <Text style={[styles.dialogSecondaryBtnText, { color: theme.primary }]}>
                  Ver na Loja Oficial
                </Text>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: 8,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  versionBannerCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
  },
  versionBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  releaseDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  bannerVerifyRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filtersScrollView: {
    marginBottom: 18,
  },
  filtersScrollContent: {
    gap: 8,
    paddingRight: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineContainer: {
    marginBottom: 16,
  },
  releaseSection: {
    marginBottom: 20,
  },
  releaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  releaseHeaderTitleCol: {
    flex: 1,
  },
  releaseVersionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  releaseCodename: {
    fontSize: 13,
    fontWeight: '700',
  },
  releaseDateSmall: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemsWrapperWithLine: {
    flexDirection: 'row',
    position: 'relative',
    marginLeft: 11,
  },
  verticalTimelineLine: {
    width: 2,
    position: 'absolute',
    left: 0,
    top: -4,
    bottom: 8,
  },
  itemsListCol: {
    flex: 1,
    paddingLeft: 20,
    gap: 12,
  },
  updateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  actionTourBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedbackCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  feedbackIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  feedbackSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  feedbackBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  footerBrand: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerCopyright: {
    fontSize: 11,
    marginTop: 2,
  },
  footerUrl: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: LayoutTokens.maxDialogWidth,
    borderRadius: BorderRadiusTokens.modal,
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
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },
  dialogPrimaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dialogPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  dialogSecondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dialogSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reportBugBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  reportBugBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
