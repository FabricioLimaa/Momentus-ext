import React, { useState, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MomentusColors,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import {
  LEGAL_DOCUMENTS,
  CURRENT_TERMS_VERSION,
  LegalLanguage,
  LegalDocumentType,
} from '@/constants/legalContent';

export default function LegalScreen() {
  const router = useRouter();
  const { mandatory } = useLocalSearchParams<{ mandatory?: string }>();
  const {
    theme,
    settings,
    acceptTermsAction,
    declineTermsAction,
    isTermsAccepted,
    userProfile,
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

  const fontSizeScale = settings.fontSizeMultiplier || 1.0;

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
            activeOpacity={0.7}>
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

          {/* Language Switcher Pill */}
          <View style={[styles.langSwitcher, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
            <TouchableOpacity
              onPress={() => setLanguage('pt')}
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
              onPress={() => setLanguage('en')}
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

        {/* Document Tabs */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.outline }]}>
          {tabs.map((tab) => {
            const isSelected = selectedDoc === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedDoc(tab.id)}
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

        {/* Main Document Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
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
          {currentDoc.sections.map((section, sIdx) => (
            <View
              key={`section-${sIdx}`}
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

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Bottom Acceptance / Status Bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.outline }]}>
          {isMandatory ? (
            <View style={styles.actionContainer}>
              {/* Checkbox agreement */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsAgreed(!isAgreed)}
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

              {/* Decline Link */}
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={handleConfirmDecline}
                activeOpacity={0.7}>
                <Ionicons name="log-out-outline" size={16} color={MomentusColors.error} />
                <Text style={[styles.declineBtnText, { color: MomentusColors.error }]}>
                  {language === 'pt' ? 'Recusar e Sair da Conta' : 'Decline and Sign Out'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.acceptedContainer}>
              <View style={styles.acceptedRow}>
                <View style={[styles.acceptedIconBox, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.acceptedTitle, { color: theme.textPrimary }]}>
                    {language === 'pt' ? 'Termos e Privacidade Aceitos' : 'Terms & Privacy Accepted'}
                  </Text>
                  <Text style={[styles.acceptedSub, { color: theme.textSecondary }]}>
                    {language === 'pt'
                      ? `Versão ${settings.termsAcceptedVersion || CURRENT_TERMS_VERSION} • Confirmado em ${settings.termsAcceptedAt || 'dispositivo'}`
                      : `Version ${settings.termsAcceptedVersion || CURRENT_TERMS_VERSION} • Confirmed on ${settings.termsAcceptedAt || 'device'}`}
                  </Text>
                </View>
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
    backgroundColor: MomentusColors.navyBackground,
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
    paddingVertical: LayoutTokens.pagePaddingTop,
    borderBottomWidth: 1,
  },
  backButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  langSwitcher: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  langOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langOptionActive: {},
  langText: {
    fontSize: 11,
    fontWeight: '700',
  },
  langTextActive: {
    fontWeight: '800',
  },
  mandatoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  mandatoryBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
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
    paddingVertical: 16,
    paddingBottom: LayoutTokens.pagePaddingBottom,
    gap: 14,
  },
  docHeaderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  docHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docHeaderInfo: {
    flex: 1,
  },
  docTitle: {
    fontWeight: '800',
    lineHeight: 22,
  },
  docSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  docBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  docIntroBox: {
    borderRadius: 10,
    padding: 12,
  },
  docIntroText: {
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTitle: {
    flex: 1,
    fontWeight: '800',
  },
  sectionIntro: {
    lineHeight: 20,
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  calloutText: {
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  bulletsList: {
    gap: 8,
    paddingLeft: 4,
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
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  subsectionsList: {
    gap: 10,
  },
  subsectionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  subsectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  subTitle: {
    flex: 1,
    fontWeight: '700',
  },
  subText: {
    lineHeight: 18,
  },
  subBulletsList: {
    gap: 6,
    marginTop: 4,
    paddingLeft: 4,
  },
  subBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
  },
  conclusionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  conclusionText: {
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  acceptBtn: {
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  declineBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  acceptedContainer: {
    paddingVertical: 4,
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  acceptedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  acceptedSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
