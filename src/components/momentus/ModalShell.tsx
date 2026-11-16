import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleProp,
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

export interface ModalShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * ModalShell
 * Casca canônica para diálogos e modais no Momentus, aplicando estritamente as regras da Grade de 8 Pontos:
 * - Padding do modal: 24px (SpacingTokens.lg)
 * - Título ↔ Descrição: 8px (SpacingTokens.sm)
 * - Cabeçalho ↔ Conteúdo: 24px (SpacingTokens.lg)
 * - Conteúdo ↔ Ações: 24px ou 32px (SpacingTokens.lg / xl)
 * - Botões de Ação: altura de 48px/56px
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  visible,
  onClose,
  title,
  description,
  icon,
  iconColor,
  children,
  actions,
  maxWidth = LayoutTokens.maxDialogWidth,
  contentStyle,
}) => {
  const { theme } = useMomentus();
  const effectiveIconColor = iconColor || theme.primary || MomentusColors.emeraldNeon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
              maxWidth,
            },
            contentStyle,
          ]}>
          {/* TopBar / Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {icon && (
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${effectiveIconColor}20` },
                  ]}>
                  <Ionicons name={icon} size={20} color={effectiveIconColor} />
                </View>
              )}
              <View style={styles.titleTextCol}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {title}
                </Text>
                {description ? (
                  <Text style={[styles.description, { color: theme.textSecondary }]}>
                    {description}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal">
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <View style={styles.body}>{children}</View>

          {/* Actions / Footer */}
          {actions && <View style={styles.actions}>{actions}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SpacingTokens.md,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    padding: SpacingTokens.lg,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SpacingTokens.lg,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
  },
  iconBox: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    borderRadius: BorderRadiusTokens.control,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    marginTop: SpacingTokens.xs,
    lineHeight: 18,
  },
  closeBtn: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SpacingTokens.sm,
  },
  body: {
    width: '100%',
  },
  actions: {
    marginTop: SpacingTokens.xl,
    gap: SpacingTokens.sm,
    width: '100%',
  },
});
