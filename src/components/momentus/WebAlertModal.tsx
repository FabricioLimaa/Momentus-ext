import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertButton,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  getContrastTextColor,
} from '@/constants/theme';

interface WebAlertItem {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface WebAlertModalProps {
  isDark: boolean;
  isOled?: boolean;
  primaryColor: string;
}

let showWebAlertHandler:
  | ((title: string, message?: string, buttons?: AlertButton[]) => void)
  | null = null;

// Guarda referência ao Alert.alert original nativo
const originalAlert = Alert.alert.bind(Alert);

// Intercepta Alert.alert para exibir a caixa de diálogo padronizada do Momentus em todas as plataformas
Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  if (showWebAlertHandler) {
    showWebAlertHandler(title, message, buttons);
    return;
  }

  // Fallback seguro caso chamado antes do modal ser montado
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const fullText = message ? `${title}\n\n${message}` : title;
      if (buttons && buttons.length > 1) {
        const actionBtn =
          buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        if (window.confirm(fullText)) {
          actionBtn?.onPress?.();
        } else {
          cancelBtn?.onPress?.();
        }
      } else {
        window.alert(fullText);
        buttons?.[0]?.onPress?.();
      }
    }
  } else {
    originalAlert(title, message, buttons);
  }
};

export const WebAlertModal: React.FC<WebAlertModalProps> = ({
  isDark,
  isOled = false,
  primaryColor,
}) => {
  const [activeAlert, setActiveAlert] = useState<WebAlertItem | null>(null);
  const queueRef = useRef<WebAlertItem[]>([]);
  const activeAlertRef = useRef<WebAlertItem | null>(null);

  useEffect(() => {
    showWebAlertHandler = (title: string, message?: string, buttons?: AlertButton[]) => {
      const nextItem: WebAlertItem = {
        title,
        message,
        buttons:
          buttons && buttons.length > 0
            ? buttons
            : [{ text: 'OK', style: 'default' }],
      };

      if (!activeAlertRef.current) {
        activeAlertRef.current = nextItem;
        setActiveAlert(nextItem);
      } else {
        queueRef.current.push(nextItem);
      }
    };

    return () => {
      showWebAlertHandler = null;
      queueRef.current = [];
      activeAlertRef.current = null;
    };
  }, []);

  if (!activeAlert) {
    return null;
  }

  const advanceQueue = () => {
    const next = queueRef.current.shift() || null;
    activeAlertRef.current = next;
    setActiveAlert(next);
  };

  const handleButtonPress = (btn: AlertButton) => {
    advanceQueue();
    setTimeout(() => {
      btn.onPress?.();
    }, 10);
  };

  const handleDismiss = () => {
    const cancelBtn = activeAlert.buttons.find((b) => b.style === 'cancel');
    advanceQueue();
    if (cancelBtn?.onPress) {
      setTimeout(() => {
        cancelBtn.onPress?.();
      }, 10);
    }
  };

  const hasDestructive = activeAlert.buttons.some((b) => b.style === 'destructive');
  const isDeleteAction =
    hasDestructive || /excluir|limpar|apagar|remover/i.test(activeAlert.title);
  const isWarningOrError =
    !isDeleteAction && /atenção|erro|danger|falha|aviso|insuficiente|bloquead/i.test(activeAlert.title);

  const iconName: keyof typeof Ionicons.glyphMap = isDeleteAction
    ? 'trash-outline'
    : isWarningOrError
      ? 'alert-circle-outline'
      : 'information-circle';
  const iconColor = isDeleteAction
    ? MomentusColors.errorRed
    : isWarningOrError
      ? MomentusColors.fireStreak
      : primaryColor;
  const iconBg = isDeleteAction
    ? 'rgba(239, 68, 68, 0.16)'
    : isWarningOrError
      ? 'rgba(245, 158, 11, 0.16)'
      : `${primaryColor}20`;
  const isMultiButtonColumn = activeAlert.buttons.length > 2;
  const surfaceBg = isOled
    ? MomentusColors.oledSurface
    : isDark
      ? MomentusColors.navySurface
      : '#FFFFFF';
  const outlineBorder = isOled
    ? MomentusColors.oledOutline
    : isDark
      ? MomentusColors.navyOutline
      : '#E2E8F0';
  const primaryContrast = getContrastTextColor(primaryColor);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}>
      <View style={[styles.overlay, isOled && { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: surfaceBg,
              borderColor: outlineBorder,
            },
          ]}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: isOled
                  ? MomentusColors.oledTextPrimary
                  : isDark
                    ? MomentusColors.textPrimary
                    : '#0F172A',
              },
            ]}>
            {activeAlert.title}
          </Text>

          {!!activeAlert.message && (
            <Text
              style={[
                styles.message,
                {
                  color: isOled
                    ? MomentusColors.oledTextSecondary
                    : isDark
                      ? MomentusColors.textSecondary
                      : '#64748B',
                },
              ]}>
              {activeAlert.message}
            </Text>
          )}

          <View
            style={[
              styles.buttonsRow,
              isMultiButtonColumn && { flexDirection: 'column', gap: SpacingTokens.sm },
            ]}>
            {activeAlert.buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <TouchableOpacity
                  key={`${btn.text || 'btn'}-${idx}`}
                  activeOpacity={0.85}
                  onPress={() => handleButtonPress(btn)}
                  accessibilityRole="button"
                  accessibilityLabel={btn.text || 'OK'}
                  style={[
                    styles.button,
                    isMultiButtonColumn && { width: '100%', flex: 0 },
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                    isCancel
                      ? {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: outlineBorder,
                        }
                      : {
                          backgroundColor: isDestructive
                            ? MomentusColors.errorRed
                            : primaryColor,
                        },
                  ]}>
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: isCancel
                          ? isOled
                            ? MomentusColors.oledTextPrimary
                            : isDark
                              ? MomentusColors.textPrimary
                              : '#334155'
                          : isDestructive
                            ? '#FFFFFF'
                            : primaryContrast,
                      },
                    ]}>
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    padding: SpacingTokens.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SpacingTokens.md,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SpacingTokens.sm,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SpacingTokens.lg,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: SpacingTokens.sm,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SpacingTokens.md,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

