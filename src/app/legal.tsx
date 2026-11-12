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
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getContrastTextColor,
  LayoutTokens,
  BorderRadiusTokens,
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
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [fontSizeStep, setFontSizeStep] = useState<number>(0); // -1, 0, 1, 2
  const [searchQuery, setSearchQuery] = useState<string>('');
  const sectionOffsetsRef = useRef<Record<string, number>>({});

  const isAccepted = isTermsAccepted();
  const isMandatory = mandatory === 'true' || !isAccepted;

  const currentDoc = useMemo(() => {
    return LEGAL_DOCUMENTS[language][selectedDoc];
  }, [language, selectedDoc]);

  const displayedSections = useMemo(() => {
    if (!searchQuery.trim()) return currentDoc.sections;
    const q = searchQuery.toLowerCase().trim();
    return currentDoc.sections.filter((s) => {
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchIntro = (s.intro || '').toLowerCase().includes(q);
      const matchSub = (s.subsections || []).some(
        (sub) => sub.subtitle.toLowerCase().includes(q) || (sub.text || '').toLowerCase().includes(q)
      );
      return matchTitle || matchIntro || matchSub;
    });
  }, [currentDoc.sections, searchQuery]);

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
    } else {
      router.back();
    }
  };

  const handleAccept = async () => {
    if (!isAgreed) return;
    setIsSubmitting(true);
    try {
      await acceptTermsAction();
      const isPt = language === 'pt';
      Alert.alert(
        isPt ? 'Termos Aceitos! ✅' : 'Terms Accepted! ✅',
        isPt
          ? `Obrigado, ${userProfile.name?.split(' ')[0] || 'Usuário'}! Seu consentimento na versão ${CURRENT_TERMS_VERSION} foi registrado.`
          : `Thank you! Your agreement to version ${CURRENT_TERMS_VERSION} has been recorded.`,
        [
          {
            text: isPt ? 'Continuar' : 'Continue',
            onPress: () => router.replace('/home'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao registrar aceite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareTerms = async () => {
    triggerHaptic('impact');
    const isPt = language === 'pt';
    const message = isPt
      ? `📜 ${currentDoc.title} do ${APP_INFO.name}:\n${APP_INFO.website}terms\n\nDesenvolvido por ${APP_INFO.developer}`
      : `📜 ${currentDoc.title} - ${APP_INFO.name}:\n${APP_INFO.website}terms\n\nDeveloped by ${APP_INFO.developer}`;

    try {
      await Share.share({
        message,
        title: currentDoc.title,
      });
    } catch (e) {
      console.warn('Erro ao compartilhar termos:', e);
    }
  };

  const handleCycleFontSize = () => {
    triggerHaptic('selection');
    setFontSizeStep((prev) => (prev >= 2 ? -1 : prev + 1));
  };

  const handleScrollToTop = () => {
    triggerHaptic('impact');
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleContactDpo = () => {
    triggerHaptic('impact');
    const subject = encodeURIComponent(`Dúvida sobre Privacidade e LGPD - ${APP_INFO.name}`);
    const body = encodeURIComponent(
      `Olá ${APP_INFO.developer} (Encarregado de Proteção de Dados - DPO),\n\nGostaria de solicitar informações / esclarecimentos sobre meus dados e privacidade no aplicativo Momentus:\n\n[Descreva sua solicitação aqui]\n`
    );
    Linking.openURL(`mailto:${APP_INFO.dpoContact}?subject=${subject}&body=${body}`);
  };

  const fontSizeScale = (settings.fontSizeMultiplier || 1.0) + fontSizeStep * 0.12;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Header Bar */}
        <View style={[styles.header, { borderBottomColor: theme.outline }]}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={[styles.backButton, { backgroundColor: theme.surfaceElevated }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

          {/* Ações do Cabeçalho: Tamanho de Fonte (A+/A-), Compartilhar e Idioma */}
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              onPress={handleCycleFontSize}
              style={[styles.headerIconBtn, { backgroundColor: theme.surfaceElevated }]}
              accessibilityRole="button"
              accessibilityLabel="Ajustar tamanho da fonte">
              <Text style={[styles.fontSizerText, { color: theme.textPrimary }]}>
                {fontSizeStep === -1 ? 'A-' : fontSizeStep === 0 ? 'A' : fontSizeStep === 1 ? 'A+' : 'A++'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShareTerms}
              style={[styles.headerIconBtn, { backgroundColor: theme.surfaceElevated }]}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar termos">
              <Ionicons name="share-social-outline" size={17} color={theme.textPrimary} />
            </TouchableOpacity>

            {/* Language Switcher Pill */}
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

        {/* Document Tabs */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.outline }]}>
          {tabs.map((tab) => {
            const isSelected = selectedDoc === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedDoc(tab.id);
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
                  style={{ marginRight: 6 }}
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

        {/* Barra de Pesquisa de Cláusulas */}
        <View style={[styles.legalSearchRow, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <Ionicons name="search-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.legalSearchInput, { color: theme.textPrimary }]}
            placeholder={language === 'pt' ? 'Buscar cláusula (ex: LGPD, dados, conta)...' : 'Search terms...'}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Pílulas de Navegação Rápida (Anchor Jump) */}
        <View style={styles.anchorPillsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.anchorPillsContainer}>
            {currentDoc.sections.map((section, idx) => (
              <TouchableOpacity
                key={section.badge || idx}
                onPress={() => {
                  triggerHaptic('selection');
                  const offset = sectionOffsetsRef.current[section.badge] || (idx * 280);
                  scrollViewRef.current?.scrollTo({ y: Math.max(0, offset - 10), animated: true });
                }}
                style={[styles.anchorPill, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                activeOpacity={0.75}>
                <Text style={[styles.anchorPillText, { color: theme.primary }]}>
                  {section.badge} {section.title.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Document Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            if (y > 320 && !showScrollTop) setShowScrollTop(true);
            else if (y <= 320 && showScrollTop) setShowScrollTop(false);
          }}>

          {/* Resumo Executivo em 1 Minuto (TL;DR Card) */}
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
              <Text style={[styles.tldrText, { color: theme.textPrimary, fontSize: 13.5 * fontSizeScale }]}>
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
                <Text style={[styles.docTitle, { color: theme.textPrimary, fontSize: 18 * fontSizeScale }]}>
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
                <Text style={[styles.docIntroText, { color: theme.textSecondary, fontSize: 13 * fontSizeScale }]}>
                  {currentDoc.intro}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Sections List */}
          {displayedSections.map((section, sIdx) => (
            <View
              key={`section-${sIdx}`}
              onLayout={(e) => {
                sectionOffsetsRef.current[section.badge] = e.nativeEvent.layout.y;
              }}
              style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.sectionBadgeText}>{section.badge}</Text>
                </View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.textPrimary, fontSize: 15 * fontSizeScale },
                  ]}>
                  {section.title}
                </Text>
              </View>

              {section.intro ? (
                <Text style={[styles.sectionIntro, { color: theme.textSecondary, fontSize: 13 * fontSizeScale }]}>
                  {section.intro}
                </Text>
              ) : null}

              {/* Callout box if present */}
              {section.callout && (
                <View
                  style={[
                    styles.calloutBox,
                    {
                      backgroundColor:
                        section.callout.type === 'warning'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : section.callout.type === 'success'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(59, 130, 246, 0.1)',
                      borderColor:
                        section.callout.type === 'warning'
                          ? '#EF4444'
                          : section.callout.type === 'success'
                          ? '#10B981'
                          : '#3B82F6',
                    },
                  ]}>
                  <Ionicons
                    name={
                      section.callout.type === 'warning'
                        ? 'warning-outline'
                        : section.callout.type === 'success'
                        ? 'checkmark-circle-outline'
                        : 'information-circle-outline'
                    }
                    size={18}
                    color={
                      section.callout.type === 'warning'
                        ? '#EF4444'
                        : section.callout.type === 'success'
                        ? '#10B981'
                        : '#3B82F6'
                    }
                  />
                  <Text
                    style={[
                      styles.calloutText,
                      {
                        color: theme.textPrimary,
                        fontSize: 12.5 * fontSizeScale,
                      },
                    ]}>
                    {section.callout.text}
                  </Text>
                </View>
              )}

              {/* Section Bullets */}
              {section.bullets && section.bullets.length > 0 && (
                <View style={styles.bulletsList}>
                  {section.bullets.map((bullet, bIdx) => (
                    <View key={`b-${bIdx}`} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: theme.primary }]} />
                      <Text
                        style={[
                          styles.bulletText,
                          { color: theme.textSecondary, fontSize: 13 * fontSizeScale },
                        ]}>
                        {bullet}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Subsections */}
              {section.subsections && section.subsections.length > 0 && (
                <View style={styles.subsectionsList}>
                  {section.subsections.map((sub, subIdx) => (
                    <View
                      key={`sub-${subIdx}`}
                      style={[
                        styles.subsectionBox,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                      ]}>
                      <View style={styles.subsectionTitleRow}>
                        {sub.badge && (
                          <View style={[styles.subBadge, { backgroundColor: theme.outline }]}>
                            <Text style={[styles.subBadgeText, { color: theme.textPrimary }]}>
                              {sub.badge}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={[
                            styles.subTitle,
                            { color: theme.textPrimary, fontSize: 13.5 * fontSizeScale },
                          ]}>
                          {sub.subtitle}
                        </Text>
                      </View>

                      {sub.text ? (
                        <Text
                          style={[
                            styles.subText,
                            { color: theme.textSecondary, fontSize: 12.5 * fontSizeScale },
                          ]}>
                          {sub.text}
                        </Text>
                      ) : null}

                      {sub.bullets && sub.bullets.length > 0 && (
                        <View style={styles.subBulletsList}>
                          {sub.bullets.map((sBullet, sbIdx) => (
                            <View key={`sb-${sbIdx}`} style={styles.bulletItem}>
                              <View style={[styles.subBulletDot, { backgroundColor: theme.primary }]} />
                              <Text
                                style={[
                                  styles.bulletText,
                                  { color: theme.textSecondary, fontSize: 12.5 * fontSizeScale },
                                ]}>
                                {sBullet}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Conclusion Note */}
          {currentDoc.conclusion ? (
            <View style={[styles.conclusionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
              <Text style={[styles.conclusionText, { color: theme.textSecondary, fontSize: 12.5 * fontSizeScale }]}>
                {currentDoc.conclusion}
              </Text>
            </View>
          ) : null}

          {/* Card Interativo de Contato com o DPO & Canais Oficiais */}
          <View style={[styles.dpoContactCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={[styles.dpoIconBox, { backgroundColor: `${theme.primary}20` }]}>
              <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
            </View>

            <Text style={[styles.dpoTitle, { color: theme.textPrimary }]}>
              {language === 'pt' ? 'Encarregado de Proteção de Dados (DPO)' : 'Data Protection Officer (DPO)'}
            </Text>
            <Text style={[styles.dpoDesc, { color: theme.textSecondary }]}>
              {language === 'pt'
                ? 'Para exercer seus direitos de titular previstos na LGPD (Art. 18), solicitar esclarecimentos ou exclusão definitiva:'
                : 'To exercise your rights under privacy regulations (LGPD / GDPR) or request clarifications:'}
            </Text>

            <TouchableOpacity
              style={[styles.dpoEmailBtn, { backgroundColor: theme.primary }]}
              onPress={handleContactDpo}
              activeOpacity={0.85}>
              <Ionicons name="mail" size={16} color={getContrastTextColor(theme.primary)} />
              <Text style={[styles.dpoEmailBtnText, { color: getContrastTextColor(theme.primary) }]}>
                {language === 'pt' ? 'Falar com o DPO' : 'Contact DPO'} ({APP_INFO.dpoContact})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dpoWebLink, { borderColor: theme.outline }]}
              onPress={() => Linking.openURL(APP_INFO.website + 'terms')}
              activeOpacity={0.7}>
              <Ionicons name="globe-outline" size={15} color={theme.textSecondary} />
              <Text style={[styles.dpoWebLinkText, { color: theme.textSecondary }]}>
                {APP_INFO.domains.official}/terms
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rodapé Institucional Oficial */}
          <View style={styles.legalFooterBrand}>
            <Text style={[styles.legalFooterText, { color: theme.textSecondary }]}>
              {APP_INFO.name} • Desenvolvido por {APP_INFO.developer}
            </Text>
            <Text style={[styles.legalFooterCopyright, { color: theme.textSecondary }]}>
              {APP_INFO.copyright}
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Botão Flutuante "Voltar ao Topo" (Scroll to Top) */}
        {showScrollTop && (
          <TouchableOpacity
            style={[styles.scrollToTopBtn, { backgroundColor: theme.primary }]}
            onPress={handleScrollToTop}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao topo">
            <Ionicons name="arrow-up" size={20} color={getContrastTextColor(theme.primary)} />
          </TouchableOpacity>
        )}

        {/* Bottom Acceptance / Status Bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.outline }]}>
          {isMandatory ? (
            <View style={styles.actionContainer}>
              {/* Checkbox agreement */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => {
                  triggerHaptic('selection');
                  setIsAgreed(!isAgreed);
                }}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkboxBox,
                    { borderColor: isAgreed ? theme.primary : theme.textSecondary },
                    isAgreed && { backgroundColor: theme.primary },
                  ]}>
                  {isAgreed && <Ionicons name="checkmark" size={14} color="#0F172A" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.textPrimary }]}>
                  {language === 'pt'
                    ? 'Eu li, compreendi e concordo com os Termos de Uso e a Política de Privacidade.'
                    : 'I have read, understood, and agree to the Terms of Use and Privacy Policy.'}
                </Text>
              </TouchableOpacity>

              {/* Accept & Continue Button */}
              <TouchableOpacity
                style={[
                  styles.acceptBtn,
                  { backgroundColor: isAgreed ? theme.primary : theme.surfaceElevated },
                ]}
                disabled={!isAgreed || isSubmitting}
                onPress={handleAccept}
                activeOpacity={0.85}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={isAgreed ? '#0F172A' : theme.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.acceptBtnText,
                    { color: isAgreed ? '#0F172A' : theme.textSecondary },
                  ]}>
                  {isSubmitting
                    ? language === 'pt'
                      ? 'Registrando...'
                      : 'Saving...'
                    : language === 'pt'
                    ? 'Aceitar e Continuar'
                    : 'Accept & Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.acceptedStatusRow}>
              <View style={[styles.statusIconCircle, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              </View>
              <View style={styles.statusTextCol}>
                <Text style={[styles.acceptedTitle, { color: theme.textPrimary }]}>
                  {language === 'pt' ? 'Termos Aceitos e Válidos' : 'Terms Accepted & Active'}
                </Text>
                <Text style={[styles.acceptedSubtitle, { color: theme.textSecondary }]}>
                  {language === 'pt'
                    ? `Consentimento registrado na versão ${CURRENT_TERMS_VERSION}.0`
                    : `Consent recorded on version ${CURRENT_TERMS_VERSION}.0`}
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  fontSizerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  langSwitcher: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
  },
  langOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
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
    paddingVertical: 12,
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
    paddingTop: 14,
    paddingBottom: 24,
  },
  tldrCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  tldrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tldrIconBox: {
    width: 26,
    height: 26,
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
    lineHeight: 20,
    fontWeight: '500',
  },
  docHeaderCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  docHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docHeaderInfo: {
    flex: 1,
  },
  docTitle: {
    fontWeight: '800',
  },
  docSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  docMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginBottom: 10,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  docBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  docIntroBox: {
    padding: 12,
    borderRadius: 10,
  },
  docIntroText: {
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionTitle: {
    fontWeight: '800',
    flex: 1,
  },
  sectionIntro: {
    lineHeight: 18,
    marginBottom: 12,
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  calloutText: {
    lineHeight: 18,
    flex: 1,
    fontWeight: '600',
  },
  bulletsList: {
    gap: 8,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    lineHeight: 18,
    flex: 1,
  },
  subsectionsList: {
    gap: 10,
    marginTop: 4,
  },
  subsectionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  subsectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  subBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subTitle: {
    fontWeight: '700',
    flex: 1,
  },
  subText: {
    lineHeight: 17,
  },
  subBulletsList: {
    gap: 6,
    marginTop: 8,
  },
  subBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  conclusionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  conclusionText: {
    flex: 1,
    lineHeight: 17,
  },
  dpoContactCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  dpoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  dpoTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  dpoDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  dpoEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 8,
    width: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dpoEmailBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dpoWebLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
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
    marginTop: 4,
    marginBottom: 8,
  },
  legalFooterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  legalFooterCopyright: {
    fontSize: 10,
    marginTop: 2,
  },
  scrollToTopBtn: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: 12,
  },
  actionContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  checkboxBox: {
    width: 22,
    height: 22,
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
    height: 48,
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
    gap: 12,
    paddingVertical: 4,
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  legalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  legalSearchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  anchorPillsWrapper: {
    marginBottom: 8,
  },
  anchorPillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  anchorPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  anchorPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
