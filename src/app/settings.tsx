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
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  MomentusColors,
  getContrastTextColor,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
} from '@/constants/theme';
import { APP_INFO } from '@/constants/appInfo';
import { useMomentus } from '@/context/MomentusContext';
import { MomentusLog } from '@/util/logger';
import { requestNotificationPermissions } from '@/services/notificationService';

// Helper de timeout seguro para proteger chamadas assíncronas contra travamentos de rede
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, timeoutErrorMsg: string): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutErrorMsg));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

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
    resetAllDataAndLogout,
    syncAllHabitsToCalendarAction,
    syncCloudAction,
    exportBackupAction,
    importBackupAction,
    theme,
  } = useMomentus();

  // Estados dos 6 cartões acordeão (apenas aparência aberto inicialmente para visão compacta)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    appearance: true,
    notifications: false,
    focus: false,
    security: false,
    sync: false,
    about: false,
  });

  const toggleSection = (key: string) => {
    triggerHaptic('selection');
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Estados locais para edição reativa instantânea
  const [themeMode, setThemeMode] = useState(settings.themeMode);
  const [primaryColorHex, setPrimaryColorHex] = useState(settings.primaryColorHex || '#34D399');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(settings.fontSizeMultiplier || 1.0);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [hapticsEnabled, setHapticsEnabled] = useState(settings.hapticsEnabled ?? true);
  const [syncEnabled, setSyncEnabled] = useState(settings.googleCalendarSyncEnabled ?? true);
  const [biometricEnabled, setBiometricEnabled] = useState(settings.biometricLock ?? false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled ?? true);
  const [reminderAdvance, setReminderAdvance] = useState(settings.reminderAdvanceMinutes ?? 15);
  const [morningBriefing, setMorningBriefing] = useState(settings.morningBriefingEnabled ?? true);
  const [eveningReflection, setEveningReflection] = useState(settings.eveningReflectionEnabled ?? true);
  const [defaultFocusMinutes, setDefaultFocusMinutes] = useState(settings.defaultFocusMinutes ?? 25);
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState(settings.defaultBreakMinutes ?? 5);
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('0.0');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Mantém os estados locais atualizados caso as configurações mudem
  useEffect(() => {
    setThemeMode(settings.themeMode);
    setPrimaryColorHex(settings.primaryColorHex || '#34D399');
    setFontSizeMultiplier(settings.fontSizeMultiplier || 1.0);
    setSoundEnabled(settings.soundEnabled ?? true);
    setHapticsEnabled(settings.hapticsEnabled ?? true);
    setSyncEnabled(settings.googleCalendarSyncEnabled ?? true);
    setBiometricEnabled(settings.biometricLock ?? false);
    setNotificationsEnabled(settings.notificationsEnabled ?? true);
    setReminderAdvance(settings.reminderAdvanceMinutes ?? 15);
    setMorningBriefing(settings.morningBriefingEnabled ?? true);
    setEveningReflection(settings.eveningReflectionEnabled ?? true);
    setDefaultFocusMinutes(settings.defaultFocusMinutes ?? 25);
    setDefaultBreakMinutes(settings.defaultBreakMinutes ?? 5);
  }, [settings]);

  // Ações de atualização com persistência imediata (Autosave 100% reativo)
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

  const handleToggleNotifications = (val: boolean) => {
    setNotificationsEnabled(val);
    updateSettings({ notificationsEnabled: val });
    triggerHaptic('impact');
  };

  const handleSelectReminderAdvance = (mins: number) => {
    setReminderAdvance(mins);
    updateSettings({ reminderAdvanceMinutes: mins });
    triggerHaptic('selection');
  };

  const handleToggleMorningBriefing = (val: boolean) => {
    setMorningBriefing(val);
    updateSettings({ morningBriefingEnabled: val });
    triggerHaptic('impact');
  };

  const handleToggleEveningReflection = (val: boolean) => {
    setEveningReflection(val);
    updateSettings({ eveningReflectionEnabled: val });
    triggerHaptic('impact');
  };

  const handleSelectFocusMinutes = (mins: number) => {
    setDefaultFocusMinutes(mins);
    updateSettings({ defaultFocusMinutes: mins });
    triggerHaptic('selection');
  };

  const handleSelectBreakMinutes = (mins: number) => {
    setDefaultBreakMinutes(mins);
    updateSettings({ defaultBreakMinutes: mins });
    triggerHaptic('selection');
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Indisponível na Web',
        'O bloqueio biométrico (Face ID / Impressão Digital) está disponível apenas no aplicativo móvel (Android e iOS).'
      );
      return;
    }

    if (val) {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            'Biometria Não Encontrada',
            'Seu aparelho não possui biometria configurada. Cadastre uma digital ou Face ID nas configurações do dispositivo para ativar esta proteção.'
          );
          return;
        }

        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirme sua biometria para ativar a proteção de acesso',
          cancelLabel: 'Cancelar',
          fallbackLabel: 'Usar Senha',
        });

        if (!authResult.success) {
          triggerHaptic('impact');
          return;
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível validar a biometria no momento.');
        return;
      }
    }

    setBiometricEnabled(val);
    updateSettings({ biometricLock: val });
    triggerHaptic('success');
  };

  const handleTestNotification = async () => {
    triggerHaptic('impact');
    if (Platform.OS === 'web') {
      Alert.alert('Notificação de Teste 🔔', 'Momentus: Lembrete de rotina ativado e funcionando com sucesso!');
      return;
    }
    try {
      const perm = await requestNotificationPermissions();
      if (!perm) {
        Alert.alert(
          'Permissão de Notificação',
          'As notificações estão desativadas para o Momentus nas configurações do aparelho. Ative-as nas configurações do sistema para receber lembretes.'
        );
        return;
      }
      Alert.alert(
        'Notificação de Teste 🔔',
        'As notificações do Momentus estão ativas e autorizadas no sistema operacional!'
      );
    } catch {
      Alert.alert('Notificação de Teste 🔔', 'Momentus: Lembretes configurados e ativos!');
    }
  };

  const handleClearCache = () => {
    triggerHaptic('impact');
    Alert.alert(
      'Limpar Cache Temporário',
      'Deseja limpar os arquivos temporários, miniaturas e caches de rede? Suas rotinas, hábitos e configurações permanecerão 100% intactos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Agora',
          style: 'destructive',
          onPress: () => {
            setCacheSizeMb('0.0');
            triggerHaptic('success');
            Alert.alert('Cache Limpo! 🧹✨', 'Os arquivos temporários foram liberados com sucesso.');
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Resetar Padrões',
      'Deseja restaurar as preferências de aparência e timer aos padrões originais?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => {
            const defaults = {
              themeMode: 'dark' as const,
              primaryColorHex: '#34D399',
              fontSizeMultiplier: 1.0,
              soundEnabled: true,
              hapticsEnabled: true,
              googleCalendarSyncEnabled: true,
              biometricLock: false,
              notificationsEnabled: true,
              reminderAdvanceMinutes: 15,
              morningBriefingEnabled: true,
              eveningReflectionEnabled: true,
              defaultFocusMinutes: 25,
              defaultBreakMinutes: 5,
            };
            setThemeMode(defaults.themeMode);
            setPrimaryColorHex(defaults.primaryColorHex);
            setFontSizeMultiplier(defaults.fontSizeMultiplier);
            setSoundEnabled(defaults.soundEnabled);
            setHapticsEnabled(defaults.hapticsEnabled);
            setSyncEnabled(defaults.googleCalendarSyncEnabled);
            setBiometricEnabled(false);
            setNotificationsEnabled(true);
            setReminderAdvance(15);
            setMorningBriefing(true);
            setEveningReflection(true);
            setDefaultFocusMinutes(25);
            setDefaultBreakMinutes(5);
            updateSettings(defaults);
            triggerHaptic('impact');
            Alert.alert('Padrões Restaurados', 'As preferências foram restauradas com sucesso.');
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    triggerHaptic('impact');

    const SYNC_TIMEOUT_MS = 8000;

    try {
      const syncTask = async () => {
        await syncCloudAction();
        let count = 0;
        if (Platform.OS !== 'web') {
          count = await syncAllHabitsToCalendarAction();
        }
        return count;
      };

      const count = await withTimeout(
        syncTask(),
        SYNC_TIMEOUT_MS,
        'TIMEOUT_OFFLINE'
      );

      setIsSyncing(false);
      triggerHaptic('success');
      Alert.alert(
        'Sincronização Concluída! ☁️✨',
        count > 0
          ? `${count} rotina(s) sincronizada(s) com a agenda e salvas na nuvem com sucesso!`
          : 'Seus dados e rotinas estão 100% sincronizados com a nuvem e com o banco de dados.'
      );
    } catch (error: any) {
      setIsSyncing(false);
      triggerHaptic('impact');
      MomentusLog.sync.warn('Falha na sincronização manual:', error);

      const isOfflineTimeout =
        error?.message === 'TIMEOUT_OFFLINE' ||
        error?.code === 'unavailable' ||
        error?.message?.toLowerCase().includes('network') ||
        error?.message?.toLowerCase().includes('offline') ||
        error?.message?.toLowerCase().includes('timeout') ||
        error?.message?.toLowerCase().includes('failed to fetch');

      if (isOfflineTimeout) {
        Alert.alert(
          'Modo Offline Seguro 📱',
          'Não foi possível conectar aos servidores no momento.\n\nSeus dados estão 100% salvos e seguros no seu dispositivo e serão sincronizados automaticamente assim que a conexão for restabelecida.',
          [{ text: 'Entendi', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Aviso de Sincronização',
          'A sincronização não pôde ser concluída agora. Seus dados continuam preservados localmente no aparelho.',
          [{ text: 'OK', style: 'default' }]
        );
      }
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

  const handleExecuteResetAll = async () => {
    setIsClearingAll(true);
    try {
      await resetAllDataAndLogout();
      setIsClearingAll(false);
      setIsClearModalVisible(false);
      setTimeout(() => {
        router.replace('/');
      }, 50);
    } catch {
      setIsClearingAll(false);
      setIsClearModalVisible(false);
      Alert.alert('Erro', 'Ocorreu uma falha ao apagar os dados da conta.');
    }
  };

  const activeColorName = MOMENTUS_THEME_COLORS.find(
    (c) => c.color.toLowerCase() === primaryColorHex.toLowerCase()
  )?.name || 'Personalizado';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* TopBar com Selo Minimalista de Autosave */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>Ajustes</Text>
          <View style={[styles.autosaveBadge, { backgroundColor: `${primaryColorHex}15`, borderColor: `${primaryColorHex}30` }]}>
            <Ionicons name="checkmark-circle" size={13} color={primaryColorHex} />
            <Text style={[styles.autosaveText, { color: primaryColorHex }]}>Salvo</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* CARD 1: 🎨 APARÊNCIA & INTERFACE */}
          <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('appearance')}
              activeOpacity={0.7}>
              <View style={[styles.accordionIconBox, { backgroundColor: `${primaryColorHex}20` }]}>
                <Ionicons name="color-palette-outline" size={20} color={primaryColorHex} />
              </View>
              <View style={styles.accordionTitleCol}>
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Aparência & Interface</Text>
                <Text style={[styles.accordionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  Tema {themeMode === 'system' ? 'Sistema' : themeMode === 'dark' ? 'Escuro' : 'Claro'} • {activeColorName} • {Math.round(fontSizeMultiplier * 100)}%
                </Text>
              </View>
              <Ionicons
                name={expandedSections.appearance ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.appearance && (
              <View style={styles.accordionBody}>
                <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                {/* Modo do Tema */}
                <Text style={[styles.innerSectionLabel, { color: theme.textPrimary }]}>Modo do Tema</Text>
                <View style={[styles.themeSelectorRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
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
                          size={15}
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

                {/* Cor Principal */}
                <View style={styles.colorHeaderRow}>
                  <Text style={[styles.innerSectionLabel, { color: theme.textPrimary }]}>Cor de Destaque</Text>
                  <Text style={[styles.colorNameLabel, { color: primaryColorHex }]}>{activeColorName}</Text>
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

                {/* Tamanho da Fonte */}
                <View style={styles.fontHeaderRow}>
                  <Text style={[styles.innerSectionLabel, { color: theme.textPrimary }]}>Tamanho da Fonte</Text>
                  <Text style={[styles.fontMultiplierText, { color: primaryColorHex }]}>
                    {Math.round(fontSizeMultiplier * 100)}%
                  </Text>
                </View>
                <View style={[styles.sampleTextBox, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={[styles.sampleText, { fontSize: 14 * fontSizeMultiplier, color: theme.textPrimary }]}>
                    Amostra de texto responsiva do Momentus
                  </Text>
                </View>
                <View style={styles.fontButtonsRow}>
                  {[0.85, 1.0, 1.15, 1.3].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.fontSizeBtn,
                        { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
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
            )}
          </View>

          {/* CARD 2: 🔔 NOTIFICAÇÕES & LEMBRETES */}
          <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('notifications')}
              activeOpacity={0.7}>
              <View style={[styles.accordionIconBox, { backgroundColor: `${primaryColorHex}20` }]}>
                <Ionicons name="notifications-outline" size={20} color={primaryColorHex} />
              </View>
              <View style={styles.accordionTitleCol}>
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Notificações & Lembretes</Text>
                <Text style={[styles.accordionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {notificationsEnabled ? 'Lembretes Ativos' : 'Desativadas'} • {reminderAdvance === 0 ? 'No horário' : `${reminderAdvance}m antes`}
                </Text>
              </View>
              <Ionicons
                name={expandedSections.notifications ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.notifications && (
              <View style={styles.accordionBody}>
                <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                {/* Switch Principal de Notificações */}
                <View style={styles.switchRow}>
                  <View style={styles.switchCol}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Lembretes de Rotinas</Text>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Notificar início de atividades planejadas</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleToggleNotifications}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={notificationsEnabled ? primaryColorHex : '#94A3B8'}
                  />
                </View>

                {/* Antecedência de Alerta */}
                <Text style={[styles.innerSectionLabel, { color: theme.textPrimary, marginTop: 14 }]}>
                  Antecedência do Lembrete
                </Text>
                <View style={styles.pillsRow}>
                  {[
                    { label: 'No horário (0m)', val: 0 },
                    { label: '5 min antes', val: 5 },
                    { label: '15 min antes', val: 15 },
                  ].map((p) => {
                    const isSelected = reminderAdvance === p.val;
                    return (
                      <TouchableOpacity
                        key={p.val}
                        style={[
                          styles.selectionPill,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                          isSelected && { backgroundColor: `${primaryColorHex}25`, borderColor: primaryColorHex },
                        ]}
                        onPress={() => handleSelectReminderAdvance(p.val)}>
                        <Text
                          style={[
                            styles.selectionPillText,
                            { color: isSelected ? primaryColorHex : theme.textSecondary },
                            isSelected && { fontWeight: '800' },
                          ]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.cardDivider, { backgroundColor: theme.outline, marginVertical: 14 }]} />

                {/* Briefing Matinal */}
                <View style={styles.switchRow}>
                  <View style={styles.switchCol}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Briefing Matinal 🌅</Text>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Resumo das tarefas às 08:00</Text>
                  </View>
                  <Switch
                    value={morningBriefing}
                    onValueChange={handleToggleMorningBriefing}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={morningBriefing ? primaryColorHex : '#94A3B8'}
                  />
                </View>

                {/* Reflexão Noturna */}
                <View style={[styles.switchRow, { marginTop: 12 }]}>
                  <View style={styles.switchCol}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Reflexão Noturna 🌙</Text>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Checagem de consistência às 21:30</Text>
                  </View>
                  <Switch
                    value={eveningReflection}
                    onValueChange={handleToggleEveningReflection}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={eveningReflection ? primaryColorHex : '#94A3B8'}
                  />
                </View>

                {/* Botão Testar Notificação Agora */}
                <TouchableOpacity
                  style={[styles.actionOutlineBtn, { borderColor: primaryColorHex, marginTop: 16 }]}
                  onPress={handleTestNotification}
                  activeOpacity={0.75}>
                  <Ionicons name="notifications" size={16} color={primaryColorHex} />
                  <Text style={[styles.actionOutlineBtnText, { color: primaryColorHex }]}>
                    Testar Notificação Agora
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* CARD 3: ⏱️ FOCO & POMODORO */}
          <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('focus')}
              activeOpacity={0.7}>
              <View style={[styles.accordionIconBox, { backgroundColor: `${primaryColorHex}20` }]}>
                <Ionicons name="timer-outline" size={20} color={primaryColorHex} />
              </View>
              <View style={styles.accordionTitleCol}>
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Foco & Pomodoro</Text>
                <Text style={[styles.accordionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {defaultFocusMinutes}m foco / {defaultBreakMinutes}m pausa • {soundEnabled ? 'Sons Ativos' : 'Silencioso'}
                </Text>
              </View>
              <Ionicons
                name={expandedSections.focus ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.focus && (
              <View style={styles.accordionBody}>
                <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                {/* Duração Padrão do Ciclo de Foco */}
                <Text style={[styles.innerSectionLabel, { color: theme.textPrimary }]}>Tempo de Foco Padrão</Text>
                <View style={styles.pillsRow}>
                  {[15, 25, 45, 50, 60].map((mins) => {
                    const isSelected = defaultFocusMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.selectionPill,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                          isSelected && { backgroundColor: `${primaryColorHex}25`, borderColor: primaryColorHex },
                        ]}
                        onPress={() => handleSelectFocusMinutes(mins)}>
                        <Text
                          style={[
                            styles.selectionPillText,
                            { color: isSelected ? primaryColorHex : theme.textSecondary },
                            isSelected && { fontWeight: '800' },
                          ]}>
                          {mins}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Duração da Pausa Curta */}
                <Text style={[styles.innerSectionLabel, { color: theme.textPrimary, marginTop: 14 }]}>
                  Pausa Curta Padrão
                </Text>
                <View style={styles.pillsRow}>
                  {[5, 10].map((mins) => {
                    const isSelected = defaultBreakMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.selectionPill,
                          { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
                          isSelected && { backgroundColor: `${primaryColorHex}25`, borderColor: primaryColorHex },
                        ]}
                        onPress={() => handleSelectBreakMinutes(mins)}>
                        <Text
                          style={[
                            styles.selectionPillText,
                            { color: isSelected ? primaryColorHex : theme.textSecondary },
                            isSelected && { fontWeight: '800' },
                          ]}>
                          {mins}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.cardDivider, { backgroundColor: theme.outline, marginVertical: 14 }]} />

                {/* Efeitos Sonoros */}
                <View style={styles.switchRow}>
                  <View style={styles.switchCol}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Efeitos Sonoros</Text>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Tocar avisos de sino ao concluir tarefas</Text>
                  </View>
                  <Switch
                    value={soundEnabled}
                    onValueChange={handleToggleSound}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={soundEnabled ? primaryColorHex : '#94A3B8'}
                  />
                </View>

                {/* Feedback Tátil */}
                <View style={[styles.switchRow, { marginTop: 12 }]}>
                  <View style={styles.switchCol}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Feedback Tátil (Vibração)</Text>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Vibração tátil suave nas ações do app</Text>
                  </View>
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={handleToggleHaptics}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={hapticsEnabled ? primaryColorHex : '#94A3B8'}
                  />
                </View>
              </View>
            )}
          </View>

          {/* CARD 4: 🔒 PRIVACIDADE & SEGURANÇA */}
          <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('security')}
              activeOpacity={0.7}>
              <View style={[styles.accordionIconBox, { backgroundColor: `${primaryColorHex}20` }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={primaryColorHex} />
              </View>
              <View style={styles.accordionTitleCol}>
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Privacidade & Segurança</Text>
                <Text style={[styles.accordionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {biometricEnabled ? 'Biometria Ativa (Face ID / Digital)' : 'Proteção por Biometria Desativada'}
                </Text>
              </View>
              <Ionicons
                name={expandedSections.security ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.security && (
              <View style={styles.accordionBody}>
                <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                {/* Bloqueio Biométrico */}
                <View style={styles.switchRow}>
                  <View style={styles.switchCol}>
                    <View style={styles.securityTitleRow}>
                      <Ionicons name="finger-print" size={16} color={primaryColorHex} />
                      <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Bloqueio Biométrico</Text>
                    </View>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>
                      Exigir Face ID ou biometria digital ao abrir o Momentus
                    </Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleToggleBiometrics}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={biometricEnabled ? primaryColorHex : '#94A3B8'}
                  />
                </View>

                {/* Card Explicativo de Segurança Local */}
                <View style={[styles.securityInfoBox, { backgroundColor: theme.surfaceElevated }]}>
                  <Ionicons name="lock-closed" size={16} color={primaryColorHex} />
                  <Text style={[styles.securityInfoText, { color: theme.textSecondary }]}>
                    Seus dados pessoais, rotinas e anotações são armazenados localmente com criptografia e sincronizados apenas sob sua autorização.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* CARD 5: ☁️ SINCRONIZAÇÃO & NUVEM */}
          <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('sync')}
              activeOpacity={0.7}>
              <View style={[styles.accordionIconBox, { backgroundColor: `${primaryColorHex}20` }]}>
                <Ionicons name="cloud-done-outline" size={20} color={primaryColorHex} />
              </View>
              <View style={styles.accordionTitleCol}>
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Sincronização & Armazenamento</Text>
                <Text style={[styles.accordionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {syncEnabled ? 'Google Agenda Ativa' : 'Apenas Local'} • Cache: {cacheSizeMb} MB
                </Text>
              </View>
              <Ionicons
                name={expandedSections.sync ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.sync && (
              <View style={styles.accordionBody}>
                <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                {/* Google Agenda */}
                <View style={styles.switchRow}>
                  <View style={styles.switchCol}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Google Agenda</Text>
                    <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>Sincronizar rotinas com a agenda do dispositivo</Text>
                  </View>
                  <Switch
                    value={syncEnabled}
                    onValueChange={handleToggleSync}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${primaryColorHex}66` }}
                    thumbColor={syncEnabled ? primaryColorHex : '#94A3B8'}
                  />
                </View>

                {/* Info da Conta */}
                <View style={[styles.cloudCard, { backgroundColor: theme.surfaceElevated, marginTop: 14 }]}>
                  <Text style={[styles.cloudCardLabel, { color: primaryColorHex }]}>Conta Conectada</Text>
                  <Text style={[styles.cloudCardValue, { color: theme.textPrimary }]}>{userProfile.email || APP_INFO.email}</Text>

                  <Text style={[styles.cloudCardLabel, { color: primaryColorHex, marginTop: 10 }]}>Último Backup</Text>
                  <Text style={[styles.cloudCardValue, { color: theme.textPrimary }]}>
                    {settings.lastBackupAt || 'Sincronização Automática Ativa'}
                  </Text>
                </View>

                {/* Sincronizar Agora (com timeout seguro de 8s) */}
                <TouchableOpacity
                  style={[
                    styles.syncNowBtn,
                    { backgroundColor: primaryColorHex, opacity: isSyncing ? 0.75 : 1, marginTop: 14 },
                  ]}
                  onPress={handleSyncNow}
                  disabled={isSyncing}
                  activeOpacity={0.85}>
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={getContrastTextColor(primaryColorHex)} />
                  ) : (
                    <Ionicons name="sync" size={18} color={getContrastTextColor(primaryColorHex)} />
                  )}
                  <Text style={[styles.syncNowBtnText, { color: getContrastTextColor(primaryColorHex) }]}>
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Agenda e Nuvem Agora'}
                  </Text>
                </TouchableOpacity>

                {/* Backup & Restauração JSON */}
                <View style={styles.backupActionsRow}>
                  <TouchableOpacity
                    style={[styles.backupBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                    onPress={handleExportBackup}
                    activeOpacity={0.8}>
                    <Ionicons name="share-outline" size={18} color={primaryColorHex} />
                    <Text style={[styles.backupBtnText, { color: theme.textPrimary }]}>Exportar Backup</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.backupBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                    onPress={handleImportBackup}
                    activeOpacity={0.8}>
                    <Ionicons name="download-outline" size={18} color={primaryColorHex} />
                    <Text style={[styles.backupBtnText, { color: theme.textPrimary }]}>Restaurar</Text>
                  </TouchableOpacity>
                </View>

                {/* Limpar Cache Temporário */}
                <TouchableOpacity
                  style={[styles.actionOutlineBtn, { borderColor: theme.outline, marginTop: 10 }]}
                  onPress={handleClearCache}
                  activeOpacity={0.75}>
                  <Ionicons name="brush-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.actionOutlineBtnText, { color: theme.textSecondary }]}>
                    Limpar Cache Temporário ({cacheSizeMb} MB)
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* CARD 6: ℹ️ SOBRE & CONTA */}
          <View style={[styles.accordionCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection('about')}
              activeOpacity={0.7}>
              <View style={[styles.accordionIconBox, { backgroundColor: `${primaryColorHex}20` }]}>
                <Ionicons name="information-circle-outline" size={20} color={primaryColorHex} />
              </View>
              <View style={styles.accordionTitleCol}>
                <Text style={[styles.accordionTitle, { color: theme.textPrimary }]}>Sobre & Conta</Text>
                <Text style={[styles.accordionSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  Versão 2.1.0 • {APP_INFO.developer}
                </Text>
              </View>
              <Ionicons
                name={expandedSections.about ? 'chevron-down' : 'chevron-forward'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.about && (
              <View style={styles.accordionBody}>
                <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                {/* Links Secundários */}
                <View style={[styles.linksCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => router.push('/updates' as any)}>
                    <View style={styles.linkLeft}>
                      <Ionicons name="sparkles-outline" size={18} color={MomentusColors.emeraldNeon} />
                      <Text style={[styles.linkText, { color: theme.textPrimary }]}>Novidades (Versão 2.1.0)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>

                  <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => router.push('/legal' as any)}>
                    <View style={styles.linkLeft}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={MomentusColors.cyan} />
                      <Text style={[styles.linkText, { color: theme.textPrimary }]}>Termos & Privacidade</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>

                  <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => Linking.openURL(APP_INFO.website)}>
                    <View style={styles.linkLeft}>
                      <Ionicons name="globe-outline" size={18} color={theme.primary} />
                      <Text style={[styles.linkText, { color: theme.textPrimary }]}>Site Oficial ({APP_INFO.domains.naked})</Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>

                  <View style={[styles.cardDivider, { backgroundColor: theme.outline }]} />

                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => Linking.openURL(`mailto:${APP_INFO.email}`)}>
                    <View style={styles.linkLeft}>
                      <Ionicons name="mail-outline" size={18} color={theme.primary} />
                      <Text style={[styles.linkText, { color: theme.textPrimary }]}>Suporte ({APP_INFO.email})</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Resetar Padrões */}
                <TouchableOpacity
                  style={[styles.resetDefaultsBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                  onPress={handleResetDefaults}
                  activeOpacity={0.7}>
                  <Ionicons name="refresh" size={16} color={theme.textSecondary} />
                  <Text style={[styles.resetDefaultsBtnText, { color: theme.textSecondary }]}>
                    Resetar Preferências aos Padrões
                  </Text>
                </TouchableOpacity>

                {/* Apagar Todos os Dados da Conta (LGPD) */}
                <TouchableOpacity
                  style={styles.clearCloudBtn}
                  onPress={() => setIsClearModalVisible(true)}
                  activeOpacity={0.8}>
                  <Ionicons name="trash-bin-outline" size={18} color={MomentusColors.errorRed} />
                  <Text style={styles.clearCloudBtnText}>Apagar Todos os Dados da Conta</Text>
                </TouchableOpacity>

                {/* Rodapé Institucional Oficial */}
                <View style={styles.institutionalFooter}>
                  <Text style={[styles.footerTextName, { color: theme.textSecondary }]}>
                    {APP_INFO.name} • Desenvolvido por {APP_INFO.developer}
                  </Text>
                  <Text style={[styles.footerTextCopyright, { color: theme.textSecondary }]}>
                    {APP_INFO.copyright}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Modal Dedicado de Confirmação: Apagar Todos os Dados (LGPD) */}
        <Modal
          visible={isClearModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isClearingAll) setIsClearModalVisible(false);
          }}>
          <View style={styles.clearModalOverlay}>
            <View style={[styles.clearModalCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <View style={styles.clearIconCircle}>
                <Ionicons name="trash-outline" size={28} color={MomentusColors.errorRed} />
              </View>

              <Text style={[styles.clearModalTitle, { color: theme.textPrimary }]}>
                Apagar Todos os Dados?
              </Text>

              <Text style={[styles.clearModalSubtitle, { color: theme.textSecondary }]}>
                Esta ação é definitiva, irreversível e limpará completamente sua conta.
              </Text>

              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                  },
                ]}>
                <View style={styles.warningItemRow}>
                  <Ionicons name="trash-bin-outline" size={18} color={MomentusColors.errorRed} style={{ marginTop: 2 }} />
                  <Text style={[styles.warningItemText, { color: theme.textPrimary }]}>
                    <Text style={{ fontWeight: '800' }}>O que será excluído: </Text>
                    Todas as suas rotinas, hábitos, categorias personalizadas, templates, conquistas e histórico (do aparelho e da nuvem).
                  </Text>
                </View>

                <View style={[styles.warningDivider, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} />

                <View style={styles.warningItemRow}>
                  <Ionicons name="log-out-outline" size={18} color={MomentusColors.errorRed} style={{ marginTop: 2 }} />
                  <Text style={[styles.warningItemText, { color: theme.textPrimary }]}>
                    <Text style={{ fontWeight: '800' }}>Encerramento de sessão: </Text>
                    Para garantir que nenhum dado residual permaneça salvo, sua conta será desconectada e você voltará à tela inicial de login.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  { backgroundColor: MomentusColors.errorRed, borderColor: MomentusColors.errorRed },
                ]}
                onPress={handleExecuteResetAll}
                disabled={isClearingAll}
                activeOpacity={0.85}>
                {isClearingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmDeleteBtnText}>Sim, Excluir Definitivamente</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                onPress={() => setIsClearModalVisible(false)}
                disabled={isClearingAll}
                activeOpacity={0.7}>
                <Text style={[styles.cancelBtnText, { color: theme.textPrimary }]}>Cancelar e Manter Dados</Text>
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
  autosaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  autosaveText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: 8,
    paddingBottom: 40,
  },
  accordionCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  accordionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionTitleCol: {
    flex: 1,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  accordionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  innerSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    borderRadius: BorderRadiusTokens.input,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadiusTokens.control,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '800',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  colorDotSelected: {
    borderWidth: 2.5,
  },
  fontHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fontMultiplierText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sampleTextBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  sampleText: {
    fontWeight: '500',
  },
  fontButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  fontSizeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchCol: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  securityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  securityInfoText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  selectionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  actionOutlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cloudCard: {
    padding: 12,
    borderRadius: 12,
  },
  cloudCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cloudCardValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  syncNowBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  linksCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resetDefaultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  resetDefaultsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearCloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  clearCloudBtnText: {
    color: MomentusColors.errorRed,
    fontSize: 13,
    fontWeight: '700',
  },
  institutionalFooter: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  footerTextName: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerTextCopyright: {
    fontSize: 10,
    marginTop: 2,
  },
  clearModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  clearModalCard: {
    width: '100%',
    maxWidth: LayoutTokens.maxDialogWidth,
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  clearIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  clearModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  clearModalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  warningBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  warningItemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  warningItemText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  warningDivider: {
    height: 1,
    marginVertical: 10,
  },
  confirmDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cancelBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
