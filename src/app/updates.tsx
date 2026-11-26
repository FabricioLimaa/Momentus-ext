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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  getContrastTextColor,
  LayoutTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  IconSize,
  useResponsiveLayout,
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
    codename: 'Mais foco, leveza e praticidade',
    date: 'Novembro de 2026',
    isCurrent: true,
    highlights:
      'Crie rotinas falando, respire nos intervalos, acompanhe seu foco na tela bloqueada e aproveite o novo tema preto puro.',
    items: [
      {
        id: 'feat-lockscreen-focus',
        icon: 'phone-portrait-outline',
        tag: 'NOVO',
        title: 'Seu foco visível na tela bloqueada e em tela cheia',
        description:
          'Acompanhe a contagem regressiva e a barra de progresso do Pomodoro direto na tela bloqueada com botões para pausar ou pular, ou ative o modo tela cheia com tela sempre ligada para usar o celular apoiado na mesa.',
        actionRoute: '/focus',
        actionLabel: 'Testar no Foco',
      },
      {
        id: 'feat-voice-routines',
        icon: 'mic-outline',
        tag: 'NOVO',
        title: 'Crie rotinas falando',
        description:
          'Toque no microfone ao adicionar uma rotina e diga algo como "Academia amanhã às 18h em Saúde" — data, horário e categoria são preenchidos na hora.',
        actionRoute: '/home',
        actionLabel: 'Criar na Home',
      },
      {
        id: 'feat-guided-breath',
        icon: 'leaf-outline',
        tag: 'NOVO',
        title: 'Pausa com respiração guiada',
        description:
          'Nos intervalos do Pomodoro, desacelere a mente com uma animação calma de respiração em tela cheia e opção de esconder o relógio.',
        actionRoute: '/focus',
        actionLabel: 'Abrir Modo Foco',
      },
      {
        id: 'feat-midnight-theme',
        icon: 'contrast-outline',
        tag: 'DESIGN',
        title: 'Novo Tema Preto Puro',
        description:
          'Um visual noturno em preto absoluto que oferece mais conforto para os olhos à noite e ajuda a economizar bateria na tela do celular.',
        actionRoute: '/settings',
        actionLabel: 'Escolher Tema',
      },
      {
        id: 'feat-tactile-feedback',
        icon: 'sparkles-outline',
        tag: 'DESIGN',
        title: 'Sensação mais gostosa ao concluir',
        description:
          'Marcar seus hábitos agora traz uma resposta suave ao toque, vibração delicada e uma barra de progresso mais fluida no topo.',
        actionRoute: '/home',
        actionLabel: 'Experimentar Agora',
      },
      {
        id: 'feat-now-and-insights',
        icon: 'bulb-outline',
        tag: 'MELHORIA',
        title: 'Foco no momento e seus melhores horários',
        description:
          'A tarefa em andamento ganha destaque automático no seu dia e as Estatísticas mostram em qual dia e turno você rende mais.',
        actionRoute: '/stats',
        actionLabel: 'Ver Estatísticas',
      },
      {
        id: 'feat-xp-progress',
        icon: 'analytics-outline',
        tag: 'MELHORIA',
        title: 'Acompanhe sua evolução no tempo',
        description:
          'Veja o crescimento dos seus pontos e níveis ao longo do último mês ou trimestre em um gráfico interativo, além de novas medalhas e molduras.',
        actionRoute: '/achievements',
        actionLabel: 'Ver Conquistas',
      },
      {
        id: 'feat-widgets-community',
        icon: 'apps-outline',
        tag: 'NOVO',
        title: 'Atalho na tela inicial e rotinas populares',
        description:
          'Acompanhe suas próximas tarefas direto na tela inicial do celular e descubra as rotinas prontas mais usadas pela comunidade.',
        actionRoute: '/templates',
        actionLabel: 'Explorar Rotinas',
      },
      {
        id: 'feat-privacy-protection',
        icon: 'shield-checkmark-outline',
        tag: 'SEGURANCA',
        title: 'Mais privacidade para a sua rotina',
        description:
          'Suas informações ficam protegidas no próprio aparelho e você pode ativar o desbloqueio por digital ou reconhecimento facial.',
        actionRoute: '/settings',
        actionLabel: 'Ver Segurança',
      },
      {
        id: 'design-zen-accessibility',
        icon: 'color-wand-outline',
        tag: 'DESIGN',
        title: 'Leitura mais confortável e toques mais precisos',
        description:
          'Textos, contrastes de cores e botões foram ajustados em todas as telas, inclusive nos avisos e celebrações no tema preto puro, que agora aparecem em sequência sem se sobrepor.',
        actionRoute: '/settings',
        actionLabel: 'Personalizar Visual',
      },
      {
        id: 'fix-stability-sync-light',
        icon: 'checkmark-done-circle-outline',
        tag: 'CORRECAO',
        title: 'Mais precisão, estabilidade e conforto no dia a dia',
        description:
          'Aprimoramos o reconhecimento de datas e horários por voz, alinhamos metas e resumo semanal nas Estatísticas, conectamos preferências de lembretes e foco em Ajustes, e melhoramos a fluidez e o espaçamento no Android e no navegador.',
        actionRoute: '/stats',
        actionLabel: 'Ver Estatísticas',
      },
    ],
  },
  {
    version: '2.0.0',
    codename: 'Agenda integrada e nuvem automática',
    date: 'Outubro de 2026',
    isCurrent: false,
    highlights:
      'Seus compromissos do Google Agenda no mesmo lugar, uso mesmo sem internet e visual renovado.',
    items: [
      {
        id: 'feat-gcal',
        icon: 'calendar-outline',
        tag: 'NOVO',
        title: 'Integração com o Google Agenda',
        description:
          'Veja e sincronize seus hábitos e compromissos junto com o seu calendário do Google, sem tarefas duplicadas.',
      },
      {
        id: 'feat-offline-cloud',
        icon: 'cloud-done-outline',
        tag: 'MELHORIA',
        title: 'Funciona mesmo sem internet',
        description:
          'Use o Momentus normalmente offline — assim que a conexão voltar, tudo é salvo na nuvem automaticamente.',
      },
      {
        id: 'feat-zen-look',
        icon: 'eye-outline',
        tag: 'DESIGN',
        title: 'Visual mais leve e organizado',
        description:
          'Cartões mais limpos, leitura confortável e navegação pensada para reduzir distrações no dia a dia.',
      },
    ],
  },
  {
    version: '1.9.0',
    codename: 'Constância e acompanhamento diário',
    date: 'Setembro de 2026',
    isCurrent: false,
    highlights:
      'Acompanhe sua sequência de dias cumpridos e entenda seu ritmo semanal com gráficos simples.',
    items: [
      {
        id: 'feat-streaks',
        icon: 'flame-outline',
        tag: 'NOVO',
        title: 'Sequência de dias e recompensas',
        description:
          'Veja quantos dias seguidos você manteve sua rotina em dia e ganhe pontos extras ao completar 100% das suas metas.',
      },
      {
        id: 'feat-stats',
        icon: 'bar-chart-outline',
        tag: 'MELHORIA',
        title: 'Resumo da sua semana',
        description:
          'Entenda rapidamente quais hábitos você mais cumpre e acompanhe sua taxa de conclusão semanal.',
      },
    ],
  },
];

export default function UpdateNotesScreen() {
  const router = useRouter();
  const { theme, triggerHaptic } = useMomentus();
  const { isLargeScreen } = useResponsiveLayout();

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showPreviousVersions, setShowPreviousVersions] = useState(false);

  const appVersion = Constants.expoConfig?.version || CHANGELOG_DATA[0].version;
  const currentRelease = CHANGELOG_DATA.find((r) => r.isCurrent) || CHANGELOG_DATA[0];
  const previousReleases = CHANGELOG_DATA.filter((r) => !r.isCurrent);

  const getTagBadgeStyle = (tag: UpdateTagType) => {
    switch (tag) {
      case 'NOVO':
        return {
          bg: `${theme.primary}20`,
          border: theme.primary,
          text: theme.primary,
          label: 'Novo',
        };
      case 'MELHORIA':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          border: '#38BDF8',
          text: '#38BDF8',
          label: 'Melhoria',
        };
      case 'DESIGN':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          border: '#A855F7',
          text: '#A855F7',
          label: 'Visual',
        };
      case 'SEGURANCA':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: '#F59E0B',
          text: '#F59E0B',
          label: 'Privacidade',
        };
      case 'CORRECAO':
        return {
          bg: 'rgba(251, 113, 133, 0.15)',
          border: '#FB7185',
          text: '#FB7185',
          label: 'Ajuste',
        };
      default:
        return {
          bg: `${theme.textSecondary}15`,
          border: theme.outline,
          text: theme.textSecondary,
          label: tag,
        };
    }
  };

  const handleShareUpdates = async () => {
    triggerHaptic('light');
    const shareMessage = [
      `✨ Confira as novidades do ${APP_INFO.name} (v${appVersion})!`,
      '',
      '• 📲 Acompanhe seu foco direto na tela bloqueada',
      '• 🎙️ Crie rotinas falando em 1 toque',
      '• 🧘 Pausas com respiração guiada no Modo Foco',
      '• 🌙 Novo Tema Preto Puro para conforto noturno',
      '• 💡 Descubra seus melhores horários de produtividade',
      '• 🔒 Mais privacidade com proteção por digital ou rosto',
      '',
      `Conheça no site oficial: ${APP_INFO.website}`,
    ].join('\n');

    try {
      await Share.share({
        message: shareMessage,
        title: `Novidades do ${APP_INFO.name}`,
      });
    } catch {
      // Usuário cancelou ou compartilhamento indisponível
    }
  };

  const handleSendFeedback = () => {
    triggerHaptic('light');
    const subject = encodeURIComponent(`Sugestão para o ${APP_INFO.name}`);
    const body = encodeURIComponent(
      `Olá ${APP_INFO.developer},\n\nGostaria de sugerir uma ideia para o ${APP_INFO.name}:\n\n[Escreva sua sugestão aqui]\n`
    );
    Linking.openURL(`mailto:${APP_INFO.email}?subject=${subject}&body=${body}`);
  };

  const handleOpenStore = () => {
    triggerHaptic('selection');
    if (Platform.OS === 'web') {
      Linking.openURL(APP_INFO.website);
      return;
    }
    const url =
      Platform.OS === 'ios'
        ? 'itms-apps://itunes.apple.com/app/id6742055620'
        : 'market://details?id=br.com.fabriciolima.momentus';
    Linking.openURL(url).catch(() => Linking.openURL(APP_INFO.website));
  };

  const renderReleaseBlock = (release: VersionRelease) => (
    <View key={release.version} style={styles.releaseSection}>
      {/* Cabeçalho da Versão */}
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
            size={release.isCurrent ? IconSize.xs : 8}
            color={release.isCurrent ? getContrastTextColor(theme.primary) : theme.textSecondary}
          />
        </View>

        <View style={styles.releaseHeaderTitleCol}>
          <View style={styles.releaseTitleInline}>
            <Text style={[styles.releaseVersionTitle, { color: theme.textPrimary }]}>
              v{release.version}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.releaseCodename,
                { color: release.isCurrent ? theme.primary : theme.textSecondary },
              ]}>
              {release.codename}
            </Text>
          </View>
          <Text style={[styles.releaseDateSmall, { color: theme.textSecondary }]}>
            {release.date}
          </Text>
        </View>
      </View>

      {/* Cards de Novidades */}
      <View style={styles.itemsWrapperWithLine}>
        <View
          style={[
            styles.verticalTimelineLine,
            { backgroundColor: release.isCurrent ? `${theme.primary}50` : theme.outline },
          ]}
        />

        <View style={styles.itemsListCol}>
          {release.items.map((item) => {
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
                    <Ionicons name={item.icon} size={IconSize.md} color={badgeStyle.text} />
                  </View>

                  <View style={styles.cardBodyCol}>
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

                {item.actionRoute && (
                  <TouchableOpacity
                    style={[styles.actionTourBtn, { backgroundColor: `${theme.primary}15` }]}
                    onPress={() => {
                      triggerHaptic('light');
                      router.push(item.actionRoute as any);
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={item.actionLabel || 'Experimentar agora'}>
                    <Text style={[styles.actionTourBtnText, { color: theme.primary }]}>
                      {item.actionLabel || 'Experimentar agora'}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const storeButtonIcon: keyof typeof Ionicons.glyphMap =
    Platform.OS === 'ios'
      ? 'logo-apple-appstore'
      : Platform.OS === 'android'
        ? 'logo-google-playstore'
        : 'globe-outline';

  const storeButtonLabel =
    Platform.OS === 'web' ? 'Visitar site oficial' : 'Abrir na loja oficial';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            maxWidth: isLargeScreen
              ? LayoutTokens.maxTabletContentWidth
              : LayoutTokens.maxContentWidth,
          },
        ]}>
        {/* TopBar limpa: Voltar + Título + Compartilhar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={IconSize.lg} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Novidades</Text>

          <TouchableOpacity
            onPress={handleShareUpdates}
            style={[
              styles.topBarBtn,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar novidades">
            <Ionicons name="share-social-outline" size={IconSize.md} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Banner Principal da Versão Atual */}
          <View
            style={[
              styles.versionBannerCard,
              {
                backgroundColor: theme.isOled ? theme.glassCard : theme.surface,
                borderColor: `${theme.primary}70`,
              },
            ]}>
            <View style={styles.versionBannerTop}>
              <View
                style={[
                  styles.versionBadge,
                  { backgroundColor: `${theme.primary}20`, borderColor: theme.primary },
                ]}>
                <Ionicons name="sparkles" size={13} color={theme.primary} />
                <Text style={[styles.versionBadgeText, { color: theme.primary }]}>
                  Versão {appVersion}
                </Text>
              </View>
              <Text style={[styles.releaseDateText, { color: theme.textSecondary }]}>
                {currentRelease.date}
              </Text>
            </View>

            <Text style={[styles.bannerTitle, { color: theme.textPrimary }]}>
              {currentRelease.codename}
            </Text>
            <Text style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
              {currentRelease.highlights}
            </Text>

            <View style={[styles.bannerFooterRow, { borderTopColor: theme.outline }]}>
              <View style={styles.statusInlineRow}>
                <Ionicons name="checkmark-circle" size={IconSize.sm} color={theme.primary} />
                <Text style={[styles.statusInlineText, { color: theme.textSecondary }]}>
                  App atualizado
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setShowVersionModal(true);
                }}
                style={[
                  styles.statusBtn,
                  { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Ver detalhes da versão">
                <Text style={[styles.statusBtnText, { color: theme.textPrimary }]}>
                  Ver na loja
                </Text>
                <Ionicons name="open-outline" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Novidades da Versão Atual */}
          <View style={styles.timelineContainer}>{renderReleaseBlock(currentRelease)}</View>

          {/* Versões Anteriores (Recolhidas por padrão para leitura leve) */}
          {previousReleases.length > 0 && (
            <View style={styles.previousSectionWrapper}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setShowPreviousVersions((prev) => !prev);
                }}
                style={[
                  styles.previousToggleBtn,
                  { backgroundColor: theme.surface, borderColor: theme.outline },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded: showPreviousVersions }}>
                <View style={styles.previousToggleLeft}>
                  <Ionicons name="time-outline" size={IconSize.md} color={theme.textSecondary} />
                  <Text style={[styles.previousToggleText, { color: theme.textPrimary }]}>
                    {showPreviousVersions
                      ? 'Ocultar versões anteriores'
                      : `Ver versões anteriores (${previousReleases.length})`}
                  </Text>
                </View>
                <Ionicons
                  name={showPreviousVersions ? 'chevron-up' : 'chevron-down'}
                  size={IconSize.md}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              {showPreviousVersions && (
                <View style={styles.previousListContainer}>
                  {previousReleases.map(renderReleaseBlock)}
                </View>
              )}
            </View>
          )}

          {/* Convite Zen de Sugestões */}
          <View
            style={[
              styles.feedbackCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            <View style={[styles.feedbackIconCircle, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="bulb-outline" size={IconSize.lg} color={theme.primary} />
            </View>
            <Text style={[styles.feedbackTitle, { color: theme.textPrimary }]}>
              Tem uma ideia para o {APP_INFO.name}?
            </Text>
            <Text style={[styles.feedbackSubtitle, { color: theme.textSecondary }]}>
              Conte para nós o que deixaria a sua rotina ainda mais leve e organizada.
            </Text>

            <TouchableOpacity
              style={[styles.feedbackBtn, { backgroundColor: theme.primary }]}
              onPress={handleSendFeedback}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Enviar uma sugestão">
              <Ionicons name="mail-outline" size={18} color={getContrastTextColor(theme.primary)} />
              <Text
                style={[styles.feedbackBtnText, { color: getContrastTextColor(theme.primary) }]}>
                Enviar uma sugestão
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
            <TouchableOpacity
              onPress={() => Linking.openURL(APP_INFO.website)}
              activeOpacity={0.7}>
              <Text style={[styles.footerUrl, { color: theme.primary }]}>
                {APP_INFO.domains.official}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: SpacingTokens.xl }} />
        </ScrollView>

        {/* Modal Simples de Status da Versão */}
        <Modal
          visible={showVersionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVersionModal(false)}>
          <View
            style={[
              styles.dialogOverlay,
              { backgroundColor: theme.isOled ? 'rgba(0, 0, 0, 0.85)' : 'rgba(15, 23, 42, 0.75)' },
            ]}>
            <View
              style={[
                styles.dialogCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <View style={[styles.dialogIconBox, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="checkmark-done" size={IconSize.xl} color={theme.primary} />
              </View>

              <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>
                {APP_INFO.name} v{appVersion}
              </Text>

              <Text style={[styles.dialogDesc, { color: theme.textSecondary }]}>
                Você está usando a versão mais recente publicada por aqui. Caso queira conferir
                novas atualizações ou avaliar o app, acesse a loja oficial.
              </Text>

              <TouchableOpacity
                style={[styles.dialogPrimaryBtn, { backgroundColor: theme.primary }]}
                onPress={handleOpenStore}
                activeOpacity={0.85}>
                <Ionicons
                  name={storeButtonIcon}
                  size={18}
                  color={getContrastTextColor(theme.primary)}
                />
                <Text
                  style={[
                    styles.dialogPrimaryBtnText,
                    { color: getContrastTextColor(theme.primary) },
                  ]}>
                  {storeButtonLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogSecondaryBtn,
                  { borderColor: theme.outline, backgroundColor: theme.surfaceElevated },
                ]}
                onPress={() => setShowVersionModal(false)}
                activeOpacity={0.8}>
                <Text style={[styles.dialogSecondaryBtnText, { color: theme.textPrimary }]}>
                  Fechar
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
  },
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: SpacingTokens.sm,
  },
  backButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  topBarBtn: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: SpacingTokens.sm,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  versionBannerCard: {
    borderRadius: BorderRadiusTokens.cardHero,
    borderWidth: 1.5,
    padding: SpacingTokens.lg,
    marginBottom: SpacingTokens.lg,
  },
  versionBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SpacingTokens.sm,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    borderWidth: 1,
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.sm,
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
    marginBottom: SpacingTokens.xs,
  },
  bannerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SpacingTokens.md,
  },
  bannerFooterRow: {
    borderTopWidth: 1,
    paddingTop: SpacingTokens.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SpacingTokens.sm,
  },
  statusInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  statusInlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    height: ComponentHeightTokens.chipLarge,
    paddingHorizontal: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineContainer: {
    marginBottom: SpacingTokens.md,
  },
  releaseSection: {
    marginBottom: SpacingTokens.lg,
  },
  releaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
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
    minWidth: 0,
  },
  releaseTitleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  releaseVersionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  releaseCodename: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  releaseDateSmall: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemsWrapperWithLine: {
    flexDirection: 'row',
    position: 'relative',
    marginLeft: SpacingTokens.sm + SpacingTokens.xs,
  },
  verticalTimelineLine: {
    width: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  itemsListCol: {
    flex: 1,
    paddingLeft: SpacingTokens.md,
    gap: SpacingTokens.md,
  },
  updateCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: SpacingTokens.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SpacingTokens.md,
  },
  cardBodyCol: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    borderRadius: BorderRadiusTokens.control,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SpacingTokens.xs,
    marginBottom: SpacingTokens.xs,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  tagBadge: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.xs,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.xs,
    height: ComponentHeightTokens.chipLarge,
    borderRadius: BorderRadiusTokens.control,
    marginTop: SpacingTokens.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: SpacingTokens.md,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  actionTourBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  previousSectionWrapper: {
    marginBottom: SpacingTokens.lg,
  },
  previousToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ComponentHeightTokens.buttonModal,
    paddingHorizontal: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  previousToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  previousToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previousListContainer: {
    marginTop: SpacingTokens.md,
  },
  feedbackCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: SpacingTokens.lg,
    alignItems: 'center',
    marginBottom: SpacingTokens.lg,
  },
  feedbackIconCircle: {
    width: ComponentHeightTokens.buttonModal,
    height: ComponentHeightTokens.buttonModal,
    borderRadius: ComponentHeightTokens.buttonModal / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SpacingTokens.md,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SpacingTokens.xs,
  },
  feedbackSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SpacingTokens.md,
  },
  feedbackBtn: {
    width: '100%',
    height: ComponentHeightTokens.buttonModal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.button,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  feedbackBtnText: {
    fontWeight: '800',
    fontSize: 14,
  },
  footerBrand: {
    alignItems: 'center',
    marginTop: SpacingTokens.xs,
    marginBottom: SpacingTokens.md,
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
    marginTop: SpacingTokens.xs,
  },
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SpacingTokens.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: LayoutTokens.maxDialogWidth,
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    padding: SpacingTokens.lg,
    alignItems: 'center',
  },
  dialogIconBox: {
    width: SpacingTokens['3xl'],
    height: SpacingTokens['3xl'],
    borderRadius: SpacingTokens['3xl'] / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SpacingTokens.md,
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
    marginTop: SpacingTokens.sm,
    marginBottom: SpacingTokens.lg,
  },
  dialogPrimaryBtn: {
    width: '100%',
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dialogPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  dialogSecondaryBtn: {
    width: '100%',
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SpacingTokens.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dialogSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
