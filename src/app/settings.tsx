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
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { GOOGLE_CALENDAR_COLORS } from '@/constants/initialData';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    updateSettings,
    userProfile,
    clearAllLocalData,
  } = useMomentus();

  // Estados locais para edição
  const [themeMode, setThemeMode] = useState(settings.themeMode);
  const [primaryColorHex, setPrimaryColorHex] = useState(settings.primaryColorHex || '#34D399');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(settings.fontSizeMultiplier || 1.0);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(settings.hapticsEnabled);
  const [syncEnabled, setSyncEnabled] = useState(settings.googleCalendarSyncEnabled ?? true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSave = () => {
    updateSettings({
      themeMode,
      primaryColorHex,
      fontSizeMultiplier,
      soundEnabled,
      hapticsEnabled,
      googleCalendarSyncEnabled: syncEnabled,
    });
    Alert.alert('Sucesso!', 'Ajustes salvos com sucesso.');
  };

  const handleReset = () => {
    setThemeMode('dark');
    setPrimaryColorHex('#34D399');
    setFontSizeMultiplier(1.0);
    setSoundEnabled(true);
    setHapticsEnabled(true);
    setSyncEnabled(true);
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      Alert.alert('Sincronizado! ☁️', 'Seus dados locais estão sincronizados com a nuvem.');
    }, 1200);
  };

  const handleConfirmClearData = () => {
    Alert.alert(
      'Limpar Dados Locais',
      'Isso removerá permanentemente suas rotinas locais e restaurará os padrões de fábrica. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: () => {
            clearAllLocalData();
            Alert.alert('Dados limpos', 'Todos os dados locais foram resetados com sucesso.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={MomentusColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Ajustes</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Seção: Personalização */}
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={24} color={primaryColorHex} />
            <Text style={styles.sectionTitle}>Personalização</Text>
          </View>

          {/* Modo do Tema */}
          <View style={styles.settingBlock}>
            <Text style={styles.settingLabel}>Modo do Tema</Text>
            <View style={styles.themeSelectorRow}>
              {[
                { mode: 'system' as const, label: 'Sistema', icon: 'phone-portrait-outline' as const },
                { mode: 'dark' as const, label: 'Escuro', icon: 'moon-outline' as const },
                { mode: 'light' as const, label: 'Claro', icon: 'sunny-outline' as const },
              ].map((item) => (
                <TouchableOpacity
                  key={item.mode}
                  onPress={() => setThemeMode(item.mode)}
                  style={[
                    styles.themeBtn,
                    themeMode === item.mode && styles.themeBtnActive,
                  ]}
                  activeOpacity={0.7}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={themeMode === item.mode ? '#0F172A' : MomentusColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeBtnText,
                      themeMode === item.mode && styles.themeBtnTextActive,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cor Principal */}
          <View style={styles.settingBlock}>
            <Text style={styles.settingLabel}>Cor Principal</Text>
            <View style={styles.colorsGrid}>
              {GOOGLE_CALENDAR_COLORS.map((item) => {
                const isSelected = primaryColorHex.toLowerCase() === item.color.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setPrimaryColorHex(item.color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: item.color },
                      isSelected && styles.colorDotSelected,
                    ]}
                    activeOpacity={0.7}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tamanho da Fonte */}
          <View style={styles.settingBlock}>
            <View style={styles.fontHeaderRow}>
              <Text style={styles.settingLabel}>Tamanho da Fonte</Text>
              <Text style={[styles.fontMultiplierText, { color: primaryColorHex }]}>
                {Math.round(fontSizeMultiplier * 100)}%
              </Text>
            </View>

            <View style={styles.sampleTextBox}>
              <Text style={[styles.sampleText, { fontSize: 14 * fontSizeMultiplier }]}>
                Amostra do texto do aplicativo
              </Text>
            </View>

            <View style={styles.fontButtonsRow}>
              {[0.85, 1.0, 1.15, 1.3].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.fontSizeBtn,
                    fontSizeMultiplier === val && { backgroundColor: `${primaryColorHex}25`, borderColor: primaryColorHex },
                  ]}
                  onPress={() => setFontSizeMultiplier(val)}>
                  <Text
                    style={[
                      styles.fontSizeBtnText,
                      fontSizeMultiplier === val && { color: primaryColorHex, fontWeight: '800' },
                    ]}>
                    {Math.round(val * 100)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experiência / Feedback Sensorial */}
          <View style={styles.settingBlock}>
            <Text style={styles.settingLabel}>Experiência</Text>
            <View style={styles.switchesCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={styles.switchTitle}>Efeitos Sonoros</Text>
                  <Text style={styles.switchDesc}>Tocar sons ao completar tarefas</Text>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#334155', true: 'rgba(52, 211, 153, 0.4)' }}
                  thumbColor={soundEnabled ? primaryColorHex : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={styles.switchTitle}>Feedback Tátil</Text>
                  <Text style={styles.switchDesc}>Vibrar ao interagir com o app</Text>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: '#334155', true: 'rgba(52, 211, 153, 0.4)' }}
                  thumbColor={hapticsEnabled ? primaryColorHex : '#94A3B8'}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={styles.switchTitle}>Google Agenda</Text>
                  <Text style={styles.switchDesc}>Sincronizar rotinas por padrão</Text>
                </View>
                <Switch
                  value={syncEnabled}
                  onValueChange={setSyncEnabled}
                  trackColor={{ false: '#334155', true: 'rgba(52, 211, 153, 0.4)' }}
                  thumbColor={syncEnabled ? primaryColorHex : '#94A3B8'}
                />
              </View>
            </View>
          </View>

          {/* Ações de Tema */}
          <View style={styles.themeActionsRow}>
            <TouchableOpacity
              style={[styles.saveThemeBtn, { backgroundColor: primaryColorHex }]}
              onPress={handleSave}
              activeOpacity={0.85}>
              <Text style={styles.saveThemeBtnText}>Salvar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetThemeBtn}
              onPress={handleReset}
              activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={MomentusColors.textSecondary} />
              <Text style={styles.resetThemeBtnText}>Resetar</Text>
            </TouchableOpacity>
          </View>

          {/* Divisor */}
          <View style={styles.sectionDivider} />

          {/* Sincronização & Nuvem */}
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-done-outline" size={24} color={primaryColorHex} />
            <Text style={styles.sectionTitle}>Sincronização</Text>
          </View>

          <View style={styles.cloudCard}>
            <Text style={styles.cloudCardLabel}>Conta</Text>
            <Text style={styles.cloudCardValue}>{userProfile.email || 'fabricio@momentus.app'}</Text>

            <Text style={[styles.cloudCardLabel, { marginTop: 12 }]}>Último Backup</Text>
            <Text style={styles.cloudCardValue}>Hoje às 10:45</Text>
          </View>

          <TouchableOpacity
            style={styles.syncNowBtn}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.85}>
            <Ionicons name="sync" size={18} color="#0F172A" />
            <Text style={styles.syncNowBtnText}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearCloudBtn}
            onPress={handleConfirmClearData}
            activeOpacity={0.8}>
            <Ionicons name="trash-bin-outline" size={18} color={MomentusColors.errorRed} />
            <Text style={styles.clearCloudBtnText}>Limpar Dados Locais</Text>
          </TouchableOpacity>

          {/* Links para Páginas Secundárias */}
          <View style={styles.linksCard}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/updates' as any)}>
              <View style={styles.linkLeft}>
                <Ionicons name="sparkles-outline" size={20} color={MomentusColors.emeraldNeon} />
                <Text style={styles.linkText}>Novidades (Versão 2.1.0)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MomentusColors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/legal' as any)}>
              <View style={styles.linkLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color={MomentusColors.cyan} />
                <Text style={styles.linkText}>Termos & Privacidade</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MomentusColors.textSecondary} />
            </TouchableOpacity>
          </View>

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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
  },
  settingBlock: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
    marginBottom: 8,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    gap: 4,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  themeBtnActive: {
    backgroundColor: MomentusColors.emeraldNeon,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: MomentusColors.textSecondary,
  },
  themeBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  fontHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fontMultiplierText: {
    fontSize: 14,
    fontWeight: '800',
  },
  sampleTextBox: {
    backgroundColor: 'rgba(51, 65, 85, 0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  sampleText: {
    color: MomentusColors.textPrimary,
  },
  fontButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    alignItems: 'center',
  },
  fontSizeBtnText: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    fontWeight: '600',
  },
  switchesCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  switchCol: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  switchDesc: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: MomentusColors.navyOutline,
    marginHorizontal: 16,
  },
  themeActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  saveThemeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveThemeBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },
  resetThemeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingVertical: 14,
    borderRadius: 16,
  },
  resetThemeBtnText: {
    color: MomentusColors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    marginVertical: 16,
  },
  cloudCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cloudCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: MomentusColors.emeraldNeon,
    textTransform: 'uppercase',
  },
  cloudCardValue: {
    fontSize: 14,
    color: MomentusColors.textPrimary,
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MomentusColors.emeraldNeon,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  syncNowBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  clearCloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
  },
  clearCloudBtnText: {
    color: MomentusColors.errorRed,
    fontWeight: '800',
    fontSize: 14,
  },
  linksCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingVertical: 4,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
});
