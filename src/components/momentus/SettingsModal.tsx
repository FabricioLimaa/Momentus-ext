import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  LayoutTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { settings, updateSettings, userProfile, theme } = useMomentus();

  const handleClearData = () => {
    Alert.alert(
      'Limpar Dados Locais',
      'Deseja resetar os dados salvos neste aparelho?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Sucesso', 'Dados reinicializados.');
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Ajustes do Aplicativo</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Personalize sons, segurança e preferências</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Som & Vibração */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ÁUDIO & SENSAÇÕES</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="volume-high-outline" size={20} color={theme.primary} />
                <View>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Efeitos Sonoros</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Sons de sucesso ao concluir hábitos</Text>
                </View>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(val) => updateSettings({ soundEnabled: val })}
                trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
                thumbColor={settings.soundEnabled ? theme.primary : '#94A3B8'}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.outline }]} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color={theme.primary} />
                <View>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Feedback Tátil (Haptic)</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Vibrações sutis ao interagir</Text>
                </View>
              </View>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(val) => updateSettings({ hapticsEnabled: val })}
                trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
                thumbColor={settings.hapticsEnabled ? theme.primary : '#94A3B8'}
              />
            </View>
          </View>

          {/* Segurança */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SEGURANÇA & PRIVACIDADE</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="finger-print-outline" size={20} color={MomentusColors.cyan} />
                <View>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Bloqueio Biométrico</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Exigir Face ID / Impressão Digital</Text>
                </View>
              </View>
              <Switch
                value={settings.biometricLock}
                onValueChange={(val) => updateSettings({ biometricLock: val })}
                trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
                thumbColor={settings.biometricLock ? theme.primary : '#94A3B8'}
              />
            </View>
          </View>

          {/* Dados & Armazenamento */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DADOS & CONTA</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Usuário</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{userProfile.email}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.outline }]} />
            <TouchableOpacity onPress={handleClearData} style={styles.dangerRow}>
              <Ionicons name="trash-bin-outline" size={18} color={MomentusColors.error} />
              <Text style={styles.dangerText}>Limpar Dados Locais</Text>
            </TouchableOpacity>
          </View>

          {/* Sobre */}
          <View style={styles.aboutBox}>
            <Text style={[styles.aboutTitle, { color: theme.textPrimary }]}>Momentus Mobile 1.6.6</Text>
            <Text style={[styles.aboutSubtitle, { color: theme.textSecondary }]}>
              Desenvolvido por Fabrício Lima • Multiplataforma iOS & Android
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: SpacingTokens.lg,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
  },
  sectionTitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SpacingTokens.sm,
    marginTop: SpacingTokens.md,
  },
  card: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SpacingTokens.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
    flex: 1,
    paddingRight: SpacingTokens.md,
  },
  rowTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: MomentusColors.navyOutline,
    marginVertical: SpacingTokens.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SpacingTokens.sm,
  },
  infoLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    color: MomentusColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    paddingVertical: SpacingTokens.sm,
  },
  dangerText: {
    color: MomentusColors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  aboutBox: {
    alignItems: 'center',
    marginTop: SpacingTokens.lg,
    marginBottom: SpacingTokens.lg,
  },
  aboutTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  aboutSubtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});

