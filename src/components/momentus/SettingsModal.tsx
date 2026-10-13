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
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { settings, updateSettings, userProfile } = useMomentus();

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
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ajustes do Aplicativo</Text>
            <Text style={styles.subtitle}>Personalize sons, segurança e preferências</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={MomentusColors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Som & Vibração */}
          <Text style={styles.sectionTitle}>ÁUDIO & SENSAÇÕES</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="volume-high-outline" size={20} color={MomentusColors.emeraldNeon} />
                <View>
                  <Text style={styles.rowTitle}>Efeitos Sonoros</Text>
                  <Text style={styles.rowSubtitle}>Sons de sucesso ao concluir hábitos</Text>
                </View>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(val) => updateSettings({ soundEnabled: val })}
                trackColor={{ false: MomentusColors.navyOutline, true: MomentusColors.emeraldNeon }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color={MomentusColors.emeraldNeon} />
                <View>
                  <Text style={styles.rowTitle}>Feedback Tátil (Haptic)</Text>
                  <Text style={styles.rowSubtitle}>Vibrações sutis ao interagir</Text>
                </View>
              </View>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(val) => updateSettings({ hapticsEnabled: val })}
                trackColor={{ false: MomentusColors.navyOutline, true: MomentusColors.emeraldNeon }}
              />
            </View>
          </View>

          {/* Segurança */}
          <Text style={styles.sectionTitle}>SEGURANÇA & PRIVACIDADE</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="finger-print-outline" size={20} color={MomentusColors.cyan} />
                <View>
                  <Text style={styles.rowTitle}>Bloqueio Biométrico</Text>
                  <Text style={styles.rowSubtitle}>Exigir Face ID / Impressão Digital</Text>
                </View>
              </View>
              <Switch
                value={settings.biometricLock}
                onValueChange={(val) => updateSettings({ biometricLock: val })}
                trackColor={{ false: MomentusColors.navyOutline, true: MomentusColors.emeraldNeon }}
              />
            </View>
          </View>

          {/* Dados & Armazenamento */}
          <Text style={styles.sectionTitle}>DADOS & CONTA</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Usuário</Text>
              <Text style={styles.infoValue}>{userProfile.email}</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity onPress={handleClearData} style={styles.dangerRow}>
              <Ionicons name="trash-bin-outline" size={18} color={MomentusColors.error} />
              <Text style={styles.dangerText}>Limpar Dados Locais</Text>
            </TouchableOpacity>
          </View>

          {/* Sobre */}
          <View style={styles.aboutBox}>
            <Text style={styles.aboutTitle}>Momentus Mobile 1.6.6</Text>
            <Text style={styles.aboutSubtitle}>
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
    paddingHorizontal: 20,
    marginBottom: 20,
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
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
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
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
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
    gap: 8,
    paddingVertical: 6,
  },
  dangerText: {
    color: MomentusColors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  aboutBox: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
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

