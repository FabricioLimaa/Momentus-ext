import React, { useEffect, useState } from 'react';
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
import { MomentusColors } from '@/constants/theme';

interface WebAlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface WebAlertModalProps {
  isDark: boolean;
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

export const WebAlertModal: React.FC<WebAlertModalProps> = ({ isDark, primaryColor }) => {
  const [alertState, setAlertState] = useState<WebAlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  useEffect(() => {
    showWebAlertHandler = (title: string, message?: string, buttons?: AlertButton[]) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons:
          buttons && buttons.length > 0
            ? buttons
            : [{ text: 'OK', style: 'default' }],
      });
    };

    return () => {
      showWebAlertHandler = null;
    };
  }, []);

  if (!alertState.visible) {
    return null;
  }

  const handleButtonPress = (btn: AlertButton) => {
    setAlertState((prev) => ({ ...prev, visible: false }));
    setTimeout(() => {
      btn.onPress?.();
    }, 10);
  };

  return (
    <Modal
      visible={alertState.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setAlertState((prev) => ({ ...prev, visible: false }))}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? MomentusColors.navySurface : '#FFFFFF',
              borderColor: isDark ? MomentusColors.navyOutline : '#E2E8F0',
            },
          ]}>
          <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}20` }]}>
            <Ionicons name="information-circle" size={28} color={primaryColor} />
          </View>

          <Text
            style={[
              styles.title,
              { color: isDark ? MomentusColors.textPrimary : '#0F172A' },
            ]}>
            {alertState.title}
          </Text>

          {!!alertState.message && (
            <Text
              style={[
                styles.message,
                { color: isDark ? MomentusColors.textSecondary : '#64748B' },
              ]}>
              {alertState.message}
            </Text>
          )}

          <View style={styles.buttonsRow}>
            {alertState.buttons.map((btn, idx) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <TouchableOpacity
                  key={`${btn.text || 'btn'}-${idx}`}
                  activeOpacity={0.85}
                  onPress={() => handleButtonPress(btn)}
                  style={[
                    styles.button,
                    isCancel
                      ? {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: isDark ? MomentusColors.navyOutline : '#CBD5E1',
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
                          ? isDark
                            ? MomentusColors.textPrimary
                            : '#334155'
                          : isDestructive
                            ? '#FFFFFF'
                            : '#000000',
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

