import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { AppTheme } from '@/context/MomentusContext';

interface ReminderModalProps {
  visible: boolean;
  habitTitle: string;
  theme: AppTheme;
  onComplete: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

/**
 * Modal de lembrete interativo equivalente ao ReminderDialog (ReminderActivity.kt) do projeto Android nativo.
 */
export const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  habitTitle,
  theme,
  onComplete,
  onSnooze,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
            },
          ]}>
          {/* Botão Fechar */}
          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Ícone de sino circular */}
          <View style={[styles.iconBox, { backgroundColor: `${theme.primary}20` }]}>
            <Ionicons name="notifications" size={32} color={theme.primary} />
          </View>

          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Lembrete de Rotina
          </Text>

          <Text style={[styles.habitTitle, { color: theme.primary }]}>
            {habitTitle}
          </Text>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Sua atividade está programada para começar agora. O que deseja fazer?
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.snoozeBtn,
                {
                  borderColor: theme.outline,
                  backgroundColor: theme.surfaceElevated,
                },
              ]}
              onPress={onSnooze}
              activeOpacity={0.8}>
              <Ionicons name="alarm-outline" size={18} color={theme.textPrimary} />
              <Text style={[styles.snoozeBtnText, { color: theme.textPrimary }]}>
                Adiar 15 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: theme.primary }]}
              onPress={onComplete}
              activeOpacity={0.85}>
              <Ionicons name="checkmark" size={18} color="#0F172A" />
              <Text style={styles.completeBtnText}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  habitTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  snoozeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  snoozeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
  },
  completeBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
});

