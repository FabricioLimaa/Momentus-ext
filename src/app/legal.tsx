import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY, LICENSE } from '@/constants/legalContent';

export default function LegalScreen() {
  const router = useRouter();
  const { theme, settings, updateSettings } = useMomentus();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [isChecked, setIsChecked] = useState<boolean>(!!settings.termsAccepted);

  const tabs = ['Termos', 'Privacidade', 'Licença'];

  const getContent = () => {
    switch (selectedTabIndex) {
      case 0:
        return TERMS_AND_CONDITIONS;
      case 1:
        return PRIVACY_POLICY;
      case 2:
        return LICENSE;
      default:
        return '';
    }
  };

  const handleAcceptTerms = () => {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;

    updateSettings({
      termsAccepted: true,
      termsAcceptedAt: formattedDate,
    });

    Alert.alert(
      'Termos Aceitos ✅',
      'Obrigado! Sua concordância com os Termos de Uso e Política de Privacidade foi registrada.',
      [{ text: 'Continuar', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Termos e Privacidade</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Row: Termos / Privacidade / Licença */}
        <View style={[styles.tabRow, { backgroundColor: theme.surface, borderBottomColor: theme.outline }]}>
          {tabs.map((tab, idx) => {
            const isSelected = selectedTabIndex === idx;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTabIndex(idx)}
                style={[
                  styles.tabButton,
                  isSelected && { borderBottomColor: theme.primary },
                ]}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isSelected ? theme.primary : theme.textSecondary },
                    isSelected && styles.tabButtonTextSelected,
                  ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content Viewer */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.textContainer, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <Text style={[styles.legalText, { color: theme.textSecondary }]}>{getContent()}</Text>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Bottom Acceptance Bar (equivalente ao TermsScreen.kt) */}
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.outline }]}>
          {settings.termsAccepted ? (
            <View style={styles.acceptedRow}>
              <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.acceptedTitle, { color: theme.textPrimary }]}>
                  Termos e Privacidade Aceitos
                </Text>
                <Text style={[styles.acceptedSub, { color: theme.textSecondary }]}>
                  Confirmado em {settings.termsAcceptedAt || 'dispositivo'}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsChecked(!isChecked)}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkboxBox,
                    { borderColor: isChecked ? theme.primary : theme.textSecondary },
                    isChecked && { backgroundColor: theme.primary },
                  ]}>
                  {isChecked && <Ionicons name="checkmark" size={14} color="#0F172A" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.textPrimary }]}>
                  Eu li e concordo com os Termos de Uso e a Política de Privacidade.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptBtn,
                  { backgroundColor: isChecked ? theme.primary : theme.surfaceElevated },
                ]}
                disabled={!isChecked}
                onPress={handleAcceptTerms}
                activeOpacity={0.85}>
                <Text
                  style={[
                    styles.acceptBtnText,
                    { color: isChecked ? '#0F172A' : theme.textSecondary },
                  ]}>
                  Aceitar e Continuar
                </Text>
              </TouchableOpacity>
            </>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: MomentusColors.navySurface,
    borderBottomWidth: 1,
    borderBottomColor: MomentusColors.navyOutline,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonSelected: {
    borderBottomColor: MomentusColors.emeraldNeon,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: MomentusColors.textSecondary,
  },
  tabButtonTextSelected: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  textContainer: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 20,
  },
  legalText: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  acceptBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
