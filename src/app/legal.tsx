import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getContrastTextColor,
  LayoutTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
} from '@/constants/theme';
import { APP_INFO } from '@/constants/appInfo';
import { useMomentus } from '@/context/MomentusContext';
import {
  LEGAL_DOCUMENTS,
  CURRENT_TERMS_VERSION,
  LegalLanguage,
  LegalDocumentType,
} from '@/constants/legalContent';

export default function LegalScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { mandatory } = useLocalSearchParams<{ mandatory?: string }>();
  const {
    theme,
    settings,
    habits,
    acceptTermsAction,
    declineTermsAction,
    isTermsAccepted,
    userProfile,
    triggerHaptic,
  } = useMomentus();

  const [language, setLanguage] = useState<LegalLanguage>('pt');
  const [selectedDoc, setSelectedDoc] = useState<LegalDocumentType>('terms');
  const [isAgreed, setIsAgreed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isAccepted = isTermsAccepted();
  const isMandatory = mandatory === 'true' || !isAccepted;

  const currentDoc = useMemo(() => {
    return LEGAL_DOCUMENTS[language][selectedDoc];
  }, [language, selectedDoc]);

  const tabs: { id: LegalDocumentType; labelPt: string; labelEn: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'terms', labelPt: 'Termos', labelEn: 'Terms', icon: 'document-text-outline' },
    { id: 'privacy', labelPt: 'Privacidade', labelEn: 'Privacy', icon: 'shield-checkmark-outline' },
    { id: 'license', labelPt: 'Licença', labelEn: 'License', icon: 'ribbon-outline' },
  ];

  const handleConfirmDecline = () => {
    const isPt = language === 'pt';
    Alert.alert(
      isPt ? 'Recusar Termos de Uso?' : 'Decline Terms of Use?',
      isPt
        ? 'O acesso ao Momentus e a sincronização segura de suas rotinas exigem a concordância com os Termos e a Política de Privacidade. Ao recusar, sua sessão será encerrada.'
        : 'Access to Momentus and secure syncing of your routines require agreeing to the Terms and Privacy Policy. By declining, your session will be signed out.',
      [
        { text: isPt ? 'Revisar' : 'Review', style: 'cancel' },
        {
          text: isPt ? 'Sair da Conta' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await declineTermsAction();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (isMandatory) {
      handleConfirmDecline();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  const handleAccept = async () => {
    if (!isAgreed) return;
    setIsSubmitting(true);
    try {
      await acceptTermsAction();
      const isPt = language === 'pt';
      const shouldShowOnboarding = !settings.hasCompletedOnboarding && habits.length === 0;
      const nextRoute = shouldShowOnboarding ? '/onboarding' : '/home';
      Alert.alert(
        isPt ? 'Termos Aceitos! ✅' : 'Terms Accepted! ✅',
        isPt
          ? `Obrigado, ${userProfile.name?.split(' ')[0] || 'Usuário'}! Seu consentimento na versão ${CURRENT_TERMS_VERSION} foi registrado.`
          : `Thank you! Your agreement to version ${CURRENT_TERMS_VERSION} has been recorded.`,
        [
          {
            text: isPt ? 'Continuar' : 'Continue',
            onPress: () => router.replace(nextRoute as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao registrar aceite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactDpo = () => {
    triggerHaptic('impact');
    const subject = encodeURIComponent(`Dúvida sobre Privacidade e LGPD - ${APP_INFO.name}`);
    const body = encodeURIComponent(
      `Olá ${APP_INFO.developer} (Encarregado de Proteção de Dados - DPO),\n\nGostaria de solicitar informações / esclarecimentos sobre meus dados e privacidade no aplicativo Momentus:\n\n[Descreva sua solicitação aqui]\n`
    );
    Linking.openURL(`mailto:${APP_INFO.dpoContact}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Header Bar - Minimalista & 8pt Grid */}
        <View style={[styles.header, { borderBottomColor: theme.outline }]}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={[styles.backButton, { backgroundColor: theme.surfaceElevated }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons
              name={isMandatory ? 'close' : 'arrow-back'}
              size={22}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {language === 'pt' ? 'Termos & Privacidade' : 'Terms & Privacy'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {language === 'pt' ? `Versão ${CURRENT_TERMS_VERSION}.0` : `Version ${CURRENT_TERMS_VERSION}.0`}
            </Text>
          </View>

          {/* Seletor de Idioma Zen (PT / EN) */}
          <View style={[styles.langSwitcher, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('selection');
                setLanguage('pt');
              }}
              style={[
                styles.langOption,
                language === 'pt' && [styles.langOptionActive, { backgroundColor: theme.primary }],
              ]}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.langText,
                  { color: language === 'pt' ? '#0F172A' : theme.textSecondary },
                  language === 'pt' && styles.langTextActive,
                ]}>
                PT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('selection');
                setLanguage('en');
              }}
              style={[
                styles.langOption,
                language === 'en' && [styles.langOptionActive, { backgroundColor: theme.primary }],
              ]}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.langText,
                  { color: language === 'en' ? '#0F172A' : theme.textSecondary },
                  language === 'en' && styles.langTextActive,
                ]}>
                EN
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mandatory Warning Banner if in gatekeeper mode */}
        {isMandatory && (
          <View
            style={[
              styles.mandatoryBanner,
              { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#F59E0B' },
            ]}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text style={[styles.mandatoryBannerText, { color: theme.textPrimary }]}>
              {language === 'pt'
                ? 'Aceite obrigatório: Por favor, leia e aceite os termos antes de acessar o aplicativo.'
                : 'Mandatory agreement: Please read and accept the terms before accessing the app.'}
            </Text>
          </View>
        )}

        {/* Document Tabs (Termos, Privacidade, Licença) */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.outline }]}>
          {tabs.map((tab) => {
            const isSelected = selectedDoc === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedDoc(tab.id);
                  scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                }}
                style={[
                  styles.tabItem,
                  isSelected && [styles.tabItemActive, { borderBottomColor: theme.primary }],
                ]}
                activeOpacity={0.7}>
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isSelected ? theme.primary : theme.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isSelected ? theme.primary : theme.textSecondary },
                    isSelected && styles.tabItemTextActive,
                  ]}>
                  {language === 'pt' ? tab.labelPt : tab.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Main Document Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Resumo Executivo em 1 Minuto (TL;DR Card Zen & 8pt) */}
          {currentDoc.tldr && (
            <View style={[styles.tldrCard, { backgroundColor: `${theme.primary}12`, borderColor: theme.primary }]}>
              <View style={styles.tldrHeaderRow}>
                <View style={[styles.tldrIconBox, { backgroundColor: `${theme.primary}25` }]}>
                  <Ionicons name="flash" size={16} color={theme.primary} />
                </View>
                <Text style={[styles.tldrTitle, { color: theme.primary }]}>
                  {language === 'pt' ? 'Resumo Executivo em 1 Minuto (TL;DR)' : '1-Minute Executive Summary (TL;DR)'}
                </Text>
              </View>
              <Text style={[styles.tldrText, { color: theme.textPrimary }]}>
                {currentDoc.tldr}
              </Text>
            </View>
          )}

          {/* Document Header Card */}
          <View style={[styles.docHeaderCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.docHeaderTop}>
              <View style={[styles.docIconBox, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons
                  name={
                    selectedDoc === 'terms'
                      ? 'document-text'
                      : selectedDoc === 'privacy'
                      ? 'shield-checkmark'
                      : 'ribbon'
                  }
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View style={styles.docHeaderInfo}>
                <Text style={[styles.docTitle, { color: theme.textPrimary }]}>
                  {currentDoc.title}
                </Text>
                <Text style={[styles.docSubtitle, { color: theme.textSecondary }]}>
                  {currentDoc.subtitle}
                </Text>
              </View>
            </View>

            <View style={[styles.docMetaRow, { borderTopColor: theme.outline }]}>
              <View style={styles.docMetaItem}>
                <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.docMetaText, { color: theme.textSecondary }]}>
                  {language === 'pt' ? 'Última atualização:' : 'Last updated:'} {currentDoc.lastUpdated}
                </Text>
              </View>
              <View style={[styles.docBadgePill, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[styles.docBadgeText, { color: theme.primary }]}>
                  v{CURRENT_TERMS_VERSION}.0
                </Text>
              </View>
            </View>

            {currentDoc.intro ? (
              <View style={[styles.docIntroBox, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[styles.docIntroText, { color: theme.textSecondary }]}>
                  {currentDoc.intro}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Sections List */}
          {currentDoc.sections.map((section, sIdx) => (
            <View
              key={`section-${sIdx}`}
              style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.sectionBadgeText}>{section.badge}</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  {section.title}
                </Text>
              </View>

              {/* Section Intro */}
              {section.intro ? (
                <Text style={[styles.sectionIntro, { color: theme.textSecondary }]}>
                  {section.intro}
                </Text>
              ) : null}

              {/* Callout Box */}
              {section.callout ? (
                <View
                  style={[
                    styles.calloutBox,
                    {
                      backgroundColor: `${theme.primary}10`,
                      borderColor: `${theme.primary}35`,
                    },
                  ]}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.calloutText, { color: theme.textPrimary }]}>
                    {section.callout.text}
                  </Text>
                </View>
              ) : null}

              {/* Bullets List */}
              {section.bullets && section.bullets.length > 0 ? (
                <View style={styles.bulletsList}>
                  {section.bullets.map((b, bIdx) => (
                    <View key={`b-${bIdx}`} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
                      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                        {b}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Subsections List */}
              {section.subsections && section.subsections.length > 0 ? (
                <View style={styles.subsectionsList}>
                  {section.subsections.map((sub, subIdx) => (
                    <View
                      key={`sub-${subIdx}`}
                      style={[
                        styles.subsectionBox,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: theme.outline,
                        },
                      ]}>
                      <View style={styles.subsectionTitleRow}>
                        <View style={[styles.subBadge, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.subBadgeText, { color: theme.primary }]}>
                            {sub.badge}
                          </Text>
                        </View>
                        <Text style={[styles.subTitle, { color: theme.textPrimary }]}>
                          {sub.subtitle}
                        </Text>
                      </View>
                      <Text style={[styles.subText, { color: theme.textSecondary }]}>
                        {sub.text}
                      </Text>

                      {sub.bullets && sub.bullets.length > 0 ? (
                        <View style={styles.subBulletsList}>
                          {sub.bullets.map((sb, sbIdx) => (
                            <View key={`sb-${sbIdx}`} style={styles.bulletItem}>
                              <View style={[styles.subBulletDot, { backgroundColor: theme.primary }]} />
                              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                                {sb}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          {/* Document Conclusion Card */}
          {currentDoc.conclusion ? (
            <View style={[styles.conclusionCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />
              <Text style={[styles.conclusionText, { color: theme.textSecondary }]}>
                {currentDoc.conclusion}
              </Text>
            </View>
          ) : null}

          {/* DPO / Privacy Contact Card */}
          <View style={[styles.dpoContactCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={[styles.dpoIconBox, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="mail" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.dpoTitle, { color: theme.textPrimary }]}>
              {language === 'pt' ? 'Encarregado de Dados (DPO)' : 'Data Protection Officer (DPO)'}
            </Text>
            <Text style={[styles.dpoDesc, { color: theme.textSecondary }]}>
              {language === 'pt'
                ? `Para exercer seus direitos de privacidade, dúvidas sobre a LGPD ou exclusão de dados, fale diretamente com o Encarregado oficial:`
                : `To exercise privacy rights, queries regarding data protection, reach out directly to the official DPO:`}
            </Text>
            <TouchableOpacity
              onPress={handleContactDpo}
              style={[styles.dpoEmailBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}>
              <Ionicons name="paper-plane-outline" size={16} color="#0F172A" />
              <Text style={[styles.dpoEmailBtnText, { color: '#0F172A' }]}>
                {language === 'pt' ? 'Falar com o DPO por E-mail' : 'Contact DPO via Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL(`${APP_INFO.website}terms`)}
              style={[styles.dpoWebLink, { borderColor: theme.outline }]}
              activeOpacity={0.75}>
              <Ionicons name="open-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.dpoWebLinkText, { color: theme.textSecondary }]}>
                {language === 'pt' ? 'Consultar Termos no Navegador Web' : 'View Terms in Web Browser'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Official Brand Footer */}
          <View style={styles.legalFooterBrand}>
            <Text style={[styles.legalFooterText, { color: theme.textSecondary }]}>
              {APP_INFO.name} • {APP_INFO.developer}
            </Text>
            <Text style={[styles.legalFooterCopyright, { color: theme.textSecondary }]}>
              {APP_INFO.copyright}
            </Text>
          </View>

          <View style={{ height: SpacingTokens.xl }} />
        </ScrollView>

        {/* Bottom Bar: Consentimento Obrigatório ou Status de Conformidade */}
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.outline }]}>
          {isMandatory ? (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  triggerHaptic('selection');
                  setIsAgreed((prev) => !prev);
                }}
                activeOpacity={0.8}>
                <View
                  style={[
                    styles.checkboxBox,
                    {
                      borderColor: isAgreed ? theme.primary : theme.textSecondary,
                      backgroundColor: isAgreed ? theme.primary : 'transparent',
                    },
                  ]}>
                  {isAgreed && <Ionicons name="checkmark" size={16} color="#0F172A" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.textPrimary }]}>
                  {language === 'pt'
                    ? `Li e concordo integralmente com os Termos e a Política de Privacidade (v${CURRENT_TERMS_VERSION}.0).`
                    : `I have read and fully agree to the Terms and Privacy Policy (v${CURRENT_TERMS_VERSION}.0).`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptBtn,
                  { backgroundColor: theme.primary },
                  (!isAgreed || isSubmitting) && { opacity: 0.4 },
                ]}
                disabled={!isAgreed || isSubmitting}
                onPress={handleAccept}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.acceptBtnText,
                    { color: getContrastTextColor(theme.primary) },
                  ]}>
                  {isSubmitting
                    ? (language === 'pt' ? 'Registrando...' : 'Saving...')
                    : (language === 'pt' ? 'Aceitar e Continuar' : 'Accept and Continue')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.acceptedStatusRow}>
              <View style={[styles.statusIconCircle, { backgroundColor: `${theme.primary}18` }]}>
                <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
              </View>
              <View style={styles.statusTextCol}>
                <Text style={[styles.acceptedTitle, { color: theme.textPrimary }]}>
                  {language === 'pt' ? 'Termos Aceitos' : 'Terms Accepted'}
                </Text>
                <Text style={[styles.acceptedSubtitle, { color: theme.textSecondary }]}>
                  {language === 'pt'
                    ? `Seu consentimento ativo na versão ${CURRENT_TERMS_VERSION}.0 está registrado com segurança.`
                    : `Active agreement to version ${CURRENT_TERMS_VERSION}.0 is securely recorded.`}
                </Text>
              </View>
            </View>
          )}
        </View>
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
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: SpacingTokens.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: ComponentHeightTokens.iconButton, // 48px
    height: ComponentHeightTokens.iconButton, // 48px
    borderRadius: ComponentHeightTokens.iconButton / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: SpacingTokens.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  langSwitcher: {
    flexDirection: 'row',
    borderRadius: BorderRadiusTokens.control, // 12px
    borderWidth: 1,
    padding: 2,
  },
  langOption: {
    paddingHorizontal: SpacingTokens.sm, // 8px
    paddingVertical: SpacingTokens.xs, // 4px
    borderRadius: BorderRadiusTokens.sm, // 8px
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  langOptionActive: {},
  langText: {
    fontSize: 11,
    fontWeight: '700',
  },
  langTextActive: {
    fontWeight: '900',
  },
  mandatoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: SpacingTokens.sm,
    borderBottomWidth: 1,
    gap: SpacingTokens.sm,
  },
  mandatoryBannerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ComponentHeightTokens.buttonModal, // 48px
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabItemActive: {},
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabItemTextActive: {
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: SpacingTokens.md, // 16px
    paddingBottom: SpacingTokens.lg, // 24px
  },
  tldrCard: {
    borderRadius: BorderRadiusTokens.cardHero, // 24px
    borderWidth: 1.5,
    padding: SpacingTokens.lg, // 24px
    marginBottom: SpacingTokens.md, // 16px
  },
  tldrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  tldrIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tldrTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tldrText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  docHeaderCard: {
    borderRadius: BorderRadiusTokens.card, // 16px
    borderWidth: 1,
    padding: SpacingTokens.md, // 16px
    marginBottom: SpacingTokens.md, // 16px
  },
  docHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
  },
  docIconBox: {
    width: ComponentHeightTokens.iconButton, // 48px
    height: ComponentHeightTokens.iconButton, // 48px
    borderRadius: BorderRadiusTokens.control, // 12px
    justifyContent: 'center',
    alignItems: 'center',
  },
  docHeaderInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  docSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  docMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  docBadgePill: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.sm,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  docIntroBox: {
    padding: SpacingTokens.sm,
    borderRadius: BorderRadiusTokens.sm,
  },
  docIntroText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: BorderRadiusTokens.card, // 16px
    borderWidth: 1,
    padding: SpacingTokens.md, // 16px
    marginBottom: SpacingTokens.md, // 16px
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  sectionBadge: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: 4,
    borderRadius: BorderRadiusTokens.sm,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  sectionIntro: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SpacingTokens.sm,
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SpacingTokens.sm,
    borderWidth: 1,
    borderRadius: BorderRadiusTokens.control,
    padding: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: '600',
  },
  bulletsList: {
    gap: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SpacingTokens.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  subsectionsList: {
    gap: SpacingTokens.sm,
    marginTop: SpacingTokens.xs,
  },
  subsectionBox: {
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    padding: SpacingTokens.md,
  },
  subsectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    marginBottom: SpacingTokens.xs,
  },
  subBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.xs,
  },
  subBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  subText: {
    fontSize: 12,
    lineHeight: 18,
  },
  subBulletsList: {
    gap: 8,
    marginTop: SpacingTokens.sm,
  },
  subBulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  conclusionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    padding: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  conclusionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  dpoContactCard: {
    borderRadius: BorderRadiusTokens.cardHero, // 24px
    borderWidth: 1,
    padding: SpacingTokens.lg, // 24px
    alignItems: 'center',
    marginBottom: SpacingTokens.md, // 16px
  },
  dpoIconBox: {
    width: ComponentHeightTokens.iconButton, // 48px
    height: ComponentHeightTokens.iconButton, // 48px
    borderRadius: ComponentHeightTokens.iconButton / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SpacingTokens.sm,
  },
  dpoTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  dpoDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SpacingTokens.md,
  },
  dpoEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    height: ComponentHeightTokens.buttonModal, // 48px
    borderRadius: BorderRadiusTokens.button,
    marginBottom: SpacingTokens.sm,
    width: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dpoEmailBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  dpoWebLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: ComponentHeightTokens.buttonCompact, // 40px
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dpoWebLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  legalFooterBrand: {
    alignItems: 'center',
    marginTop: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  legalFooterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  legalFooterCopyright: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: SpacingTokens.md, // 16px
  },
  actionContainer: {
    gap: SpacingTokens.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    fontWeight: '600',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ComponentHeightTokens.buttonModal, // 48px
    borderRadius: BorderRadiusTokens.button,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  acceptedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
    paddingVertical: SpacingTokens.xs,
  },
  statusIconCircle: {
    width: ComponentHeightTokens.chipLarge, // 40px
    height: ComponentHeightTokens.chipLarge, // 40px
    borderRadius: ComponentHeightTokens.chipLarge / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextCol: {
    flex: 1,
  },
  acceptedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  acceptedSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});
