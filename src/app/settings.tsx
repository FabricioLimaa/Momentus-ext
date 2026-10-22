import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

// Paleta completa de personalização com o Verde Esmeralda Neon como primeira opção
export const MOMENTUS_THEME_COLORS = [
  { id: 'emerald', color: '#34D399', name: 'Esmeralda Neon' },
  { id: 'electric-blue', color: '#38BDF8', name: 'Azul Elétrico' },
  { id: 'indigo', color: '#818CF8', name: 'Índigo' },
  { id: 'purple', color: '#A855F7', name: 'Roxo Neon' },
  { id: 'rose', color: '#FB7185', name: 'Rosa Neon' },
  { id: 'amber', color: '#FBBF24', name: 'Âmbar Dourado' },
  { id: 'orange', color: '#FB923C', name: 'Laranja Solar' },
  { id: 'sage', color: '#33B679', name: 'Sálvia' },
  { id: 'grape', color: '#8E24AA', name: 'Uva' },
  { id: 'peacock', color: '#039BE5', name: 'Pavão' },
  { id: 'graphite', color: '#64748B', name: 'Grafite' },
  { id: 'tomato', color: '#EF4444', name: 'Tomate / Rubi' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    updateSettings,
    triggerHaptic,
    userProfile,
    clearAllLocalData,
    clearCloudDataAction,
    syncAllHabitsToCalendarAction,
    syncCloudAction,
    exportBackupAction,
    importBackupAction,
    theme,
  } = useMomentus();

  // Estados locais para edição
  const [themeMode, setThemeMode] = useState(settings.themeMode);
  const [primaryColorHex, setPrimaryColorHex] = useState(settings.primaryColorHex || '#34D399');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(settings.fontSizeMultiplier || 1.0);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(settings.hapticsEnabled);
  const [syncEnabled, setSyncEnabled] = useState(settings.googleCalendarSyncEnabled ?? true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Mantém os estados locais atualizados caso as configurações mudem
  useEffect(() => {
    setThemeMode(settings.themeMode);
    setPrimaryColorHex(settings.primaryColorHex || '#34D399');
    setFontSizeMultiplier(settings.fontSizeMultiplier || 1.0);
    setSoundEnabled(settings.soundEnabled);
    setHapticsEnabled(settings.hapticsEnabled);
    setSyncEnabled(settings.googleCalendarSyncEnabled ?? true);
  }, [
    settings.themeMode,
    settings.primaryColorHex,
    settings.fontSizeMultiplier,
    settings.soundEnabled,
    settings.hapticsEnabled,
    settings.googleCalendarSyncEnabled,
  ]);

  // Ações com reatividade instantânea
  const handleSelectTheme = (mode: 'system' | 'dark' | 'light') => {
    setThemeMode(mode);
    updateSettings({ themeMode: mode });
    triggerHaptic('impact');
  };

  const handleSelectColor = (color: string) => {
    setPrimaryColorHex(color);
    updateSettings({ primaryColorHex: color });
    triggerHaptic('impact');
  };

  const handleSelectFontSize = (val: number) => {
    setFontSizeMultiplier(val);
    updateSettings({ fontSizeMultiplier: val });
    triggerHaptic('impact');
  };

  const handleToggleSound = (val: boolean) => {
    setSoundEnabled(val);
    updateSettings({ soundEnabled: val });
    triggerHaptic('impact');
  };

  const handleToggleHaptics = (val: boolean) => {
    setHapticsEnabled(val);
    updateSettings({ hapticsEnabled: val });
    if (val) triggerHaptic('impact');
  };

  const handleToggleSync = (val: boolean) => {
    setSyncEnabled(val);
    updateSettings({ googleCalendarSyncEnabled: val });
    triggerHaptic('impact');
  };

  const handleSave = () => {
    updateSettings({
      themeMode,
      primaryColorHex,
      fontSizeMultiplier,
      soundEnabled,
      hapticsEnabled,
      googleCalendarSyncEnabled: syncEnabled,
    });
    triggerHaptic('success');
    Alert.alert('Sucesso!', 'Ajustes salvos e aplicados com sucesso.');
  };

  const handleReset = () => {
    const defaults = {
      themeMode: 'dark' as const,
      primaryColorHex: '#34D399',
      fontSizeMultiplier: 1.0,
      soundEnabled: true,
      hapticsEnabled: true,
      googleCalendarSyncEnabled: true,
    };
    setThemeMode(defaults.themeMode);
    setPrimaryColorHex(defaults.primaryColorHex);
    setFontSizeMultiplier(defaults.fontSizeMultiplier);
    setSoundEnabled(defaults.soundEnabled);
    setHapticsEnabled(defaults.hapticsEnabled);
    setSyncEnabled(defaults.googleCalendarSyncEnabled);
    updateSettings(defaults);
    triggerHaptic('impact');
    Alert.alert('Padrões Restaurados', 'As preferências visuais e de experiência foram restauradas aos padrões originais.');
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      // 1. Sincroniza diretamente com o Cloud Firestore
      await syncCloudAction().catch(() => {});

      // 2. Sincroniza com a agenda nativa apenas em dispositivos móveis (evita downloads de arquivos na Web)
      let count = 0;
      if (Platform.OS !== 'web') {
        count = await syncAllHabitsToCalendarAction();
      }

      setIsSyncing(false);
      Alert.alert(
        'Sincronização Concluída! ☁️✨',
        count > 0
          ? `${count} rotina(s) sincronizada(s) com a agenda e salvas na nuvem!`
          : 'Seus dados e rotinas estão 100% sincronizados com a nuvem e com o banco de dados.'
      );
    } catch {
      setIsSyncing(false);
      Alert.alert('Aviso', 'Não foi possível completar a sincronização. Verifique sua conexão e permissões.');
    }
  };

  const handleExportBackup = async () => {
    try {
      await exportBackupAction();
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o backup. Tente novamente.');
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Restaurar Backup',
      'Ao restaurar um arquivo de backup, suas rotinas e categorias atuais serão mescladas com os dados do arquivo. Deseja selecionar um arquivo .json?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Escolher Arquivo',
          onPress: async () => {
            try {
              const success = await importBackupAction();
              if (success) {
                Alert.alert('Backup Restaurado! 🚀', 'Todos os seus hábitos, categorias e progresso foram restaurados com sucesso.');
              }
            } catch {
              Alert.alert('Erro', 'Arquivo de backup corrompido ou formato incompatível.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmClearData = () => {
    Alert.alert(
      'Limpar Dados do Aplicativo',
      'Escolha se deseja restaurar apenas os dados deste dispositivo ou também apagar seus dados armazenados na nuvem (Firestore):',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apenas Local',
          style: 'destructive',
          onPress: () => {
            clearAllLocalData();
            Alert.alert('Dados Locais Limpos', 'Todos os dados locais foram resetados com sucesso.');
          },
        },
        {
          text: 'Local + Nuvem',
          style: 'destructive',
          onPress: async () => {
            clearAllLocalData();
            await clearCloudDataAction().catch(() => false);
            Alert.alert(
              'Limpeza Completa Concluída',
              'Seus dados locais e da nuvem foram completamente removidos.'
            );
          },
        },
      ]
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
          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Ajustes</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Seção: Personalização */}
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={24} color={primaryColorHex} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personalização</Text>
          </View>

          {/* Modo do Tema */}
          <View style={styles.settingBlock}>
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Modo do Tema</Text>
            <View style={[styles.themeSelectorRow, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              {[
                { mode: 'system' as const, label: 'Sistema', icon: 'phone-portrait-outline' as const },
                { mode: 'dark' as const, label: 'Escuro', icon: 'moon-outline' as const },
                { mode: 'light' as const, label: 'Claro', icon: 'sunny-outline' as const },
              ].map((item) => {
                const isActive = themeMode === item.mode;
                const activeContrast = getContrastTextColor(primaryColorHex);
                return (
                  <TouchableOpacity
                    key={item.mode}
                    onPress={() => handleSelectTheme(item.mode)}
                    style={[
                      styles.themeBtn,
                      isActive && { backgroundColor: primaryColorHex },
                    ]}
                    activeOpacity={0.7}>
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isActive ? activeContrast : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.themeBtnText,
                        { color: isActive ? activeContrast : theme.textSecondary },
                        isActive && styles.themeBtnTextActive,
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Cor Principal */}
          <View style={styles.settingBlock}>
            <View style={styles.colorHeaderRow}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Cor Principal</Text>
              <Text style={[styles.colorNameLabel, { color: primaryColorHex }]}>
                {MOMENTUS_THEME_COLORS.find(
                  (c) => c.color.toLowerCase() === primaryColorHex.toLowerCase()
                )?.name || 'Personalizado'}
              </Text>
            </View>
            <View style={styles.colorsGrid}>
              {MOMENTUS_THEME_COLORS.map((item) => {
                const isSelected = primaryColorHex.toLowerCase() === item.color.toLowerCase();
                const checkContrast = getContrastTextColor(item.color);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectColor(item.color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: item.color },
                      isSelected && [styles.colorDotSelected, { borderColor: theme.textPrimary }],
                    ]}
                    activeOpacity={0.7}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={checkContrast} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tamanho da Fonte */}
          <View style={styles.settingBlock}>
            <View style={styles.fontHeaderRow}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Tamanho da Fonte</Text>
              <Text style={[styles.fontMultiplierText, { color: primaryColorHex }]}>
                {Math.round(fontSizeMultiplier * 100)}%
              </Text>
            </View>

            <View style={[styles.sampleTextBox, { backgroundColor: theme.surfaceElevated }]}>
              <Text style={[styles.sampleText, { fontSize: 14 * fontSizeMultiplier, color: theme.textPrimary }]}>
                Amostra do texto do aplicativo
              </Text>
            </View>

            <View style={styles.fontButtonsRow}>
              {[0.85, 1.0, 1.15, 1.3].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.fontSizeBtn,
                    { backgroundColor: theme.surface, borderColor: theme.outline },
                    fontSizeMultiplier === val && { backgroundColor: `${primaryColorHex}25`, borderColor: primaryColorHex },
                  ]}
                  onPress={() => handleSelectFontSize(val)}>
                  <Text
                    style={[
                      styles.fontSizeBtnText,
                      { color: theme.textSecondary },
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
            <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Experiência</Text>
            <View style={[styles.switchesCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Efeitos Sonoros</Text>
                  <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Tocar sons ao completar tarefas</Text>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={handleToggleSound}
                  trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
                  thumbColor={soundEnabled ? primaryColorHex : '#94A3B8'}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.outline }]} />

              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Feedback Tátil</Text>
                  <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Vibrar ao interagir com o app</Text>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={handleToggleHaptics}
                  trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
                  thumbColor={hapticsEnabled ? primaryColorHex : '#94A3B8'}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.outline }]} />

              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Google Agenda</Text>
                  <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Sincronizar rotinas por padrão</Text>
                </View>
                <Switch
                  value={syncEnabled}
                  onValueChange={handleToggleSync}
                  trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
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
              <Text style={[styles.saveThemeBtnText, { color: getContrastTextColor(primaryColorHex) }]}>
                Salvar Ajustes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resetThemeBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
              onPress={handleReset}
              activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={theme.textSecondary} />
              <Text style={[styles.resetThemeBtnText, { color: theme.textSecondary }]}>Resetar Padrões</Text>
            </TouchableOpacity>
          </View>

          {/* Divisor */}
          <View style={[styles.sectionDivider, { backgroundColor: theme.outline }]} />

          {/* Sincronização & Nuvem */}
          <View style={styles.sectionHeader}>
            <Ionicons name="cloud-done-outline" size={24} color={primaryColorHex} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Sincronização</Text>
          </View>

          <View style={[styles.cloudCard, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={styles.cloudCardLabel}>Conta</Text>
            <Text style={[styles.cloudCardValue, { color: theme.textPrimary }]}>{userProfile.email || 'contato@momentusapp.com.br'}</Text>

            <Text style={[styles.cloudCardLabel, { marginTop: 12 }]}>Último Backup / Sincronização</Text>
            <Text style={[styles.cloudCardValue, { color: theme.textPrimary }]}>
              {settings.lastBackupAt || 'Sincronização Automática Ativa'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.syncNowBtn}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.85}>
            <Ionicons name="sync" size={18} color="#0F172A" />
            <Text style={styles.syncNowBtnText}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Agenda e Nuvem Agora'}
            </Text>
          </TouchableOpacity>

          {/* Seção: Backup & Restauração JSON */}
          <View style={styles.backupActionsRow}>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
              onPress={handleExportBackup}
              activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={primaryColorHex} />
              <Text style={[styles.backupBtnText, { color: theme.textPrimary }]}>Exportar Backup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
              onPress={handleImportBackup}
              activeOpacity={0.8}>
              <Ionicons name="download-outline" size={18} color={primaryColorHex} />
              <Text style={[styles.backupBtnText, { color: theme.textPrimary }]}>Restaurar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.clearCloudBtn}
            onPress={handleConfirmClearData}
            activeOpacity={0.8}>
            <Ionicons name="trash-bin-outline" size={18} color={MomentusColors.errorRed} />
            <Text style={styles.clearCloudBtnText}>Limpar Dados (Local / Nuvem)</Text>
          </TouchableOpacity>

          {/* Links para Páginas Secundárias */}
          <View style={[styles.linksCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/updates' as any)}>
              <View style={styles.linkLeft}>
                <Ionicons name="sparkles-outline" size={20} color={MomentusColors.emeraldNeon} />
                <Text style={[styles.linkText, { color: theme.textPrimary }]}>Novidades (Versão 2.1.0)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/legal' as any)}>
              <View style={styles.linkLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color={MomentusColors.cyan} />
                <Text style={[styles.linkText, { color: theme.textPrimary }]}>Termos & Privacidade</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL('https://www.momentusapp.com.br/')}>
              <View style={styles.linkLeft}>
                <Ionicons name="globe-outline" size={20} color={theme.primary} />
                <Text style={[styles.linkText, { color: theme.textPrimary }]}>Site Oficial (momentusapp.com.br)</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={theme.textSecondary} />
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
    fontWeight: '800',
  },
  colorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorNameLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  backupActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 16,
  },
  backupBtnText: {
    fontWeight: '700',
    fontSize: 13,
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

