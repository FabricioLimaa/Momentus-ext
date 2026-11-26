import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  getContrastTextColor,
} from '@/constants/theme';
import { soundManager } from '@/util/soundManager';

interface CelebrationModalProps {
  visible: boolean;
  title: string;
  message: string;
  pointsEarned?: number;
  isDark?: boolean;
  isOled?: boolean;
  primaryColor?: string;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  visible,
  title,
  message,
  pointsEarned,
  isDark = true,
  isOled = false,
  primaryColor = MomentusColors.emeraldNeon,
  onClose,
}) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      soundManager.playAchievementSound();
      animationRef.current?.play();
    }
  }, [visible, title, message]);

  const cardBg = isOled
    ? MomentusColors.oledSurface
    : isDark
      ? MomentusColors.navySurface
      : '#FFFFFF';
  const cardBorder = isOled
    ? MomentusColors.oledOutline
    : isDark
      ? MomentusColors.navyOutline
      : '#E2E8F0';
  const titleColor = isOled
    ? MomentusColors.oledTextPrimary
    : isDark
      ? MomentusColors.textPrimary
      : '#0F172A';
  const msgColor = isOled
    ? MomentusColors.oledTextSecondary
    : isDark
      ? MomentusColors.textSecondary
      : '#64748B';
  const buttonTextColor = getContrastTextColor(primaryColor);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[styles.overlay, isOled && { backgroundColor: 'rgba(0, 0, 0, 0.85)' }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}>
          {/* Lottie Animation */}
          <View style={styles.animationContainer}>
            <LottieView
              ref={animationRef}
              source={
                isDark
                  ? require('@/assets/lottie/success_dark.json')
                  : require('@/assets/lottie/success_light.json')
              }
              autoPlay
              loop={false}
              style={styles.lottie}
            />
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: titleColor }]}>
            {title}
          </Text>

          <Text style={[styles.message, { color: msgColor }]}>
            {message}
          </Text>

          {/* Points Badge */}
          {typeof pointsEarned === 'number' && pointsEarned > 0 ? (
            <View
              style={[
                styles.pointsBadge,
                { backgroundColor: `${primaryColor}20` },
              ]}>
              <Ionicons name="sparkles" size={16} color={primaryColor} />
              <Text style={[styles.pointsText, { color: primaryColor }]}>
                +{pointsEarned} XP Conquistados!
              </Text>
            </View>
          ) : pointsEarned === 0 ? (
            <View
              style={[
                styles.pointsBadge,
                { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#F1F5F9' },
              ]}>
              <Ionicons
                name="checkmark-done-circle"
                size={16}
                color={msgColor}
              />
              <Text
                style={[
                  styles.pointsText,
                  { color: msgColor },
                ]}>
                XP diário já validado anteriormente
              </Text>
            </View>
          ) : null}

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar celebração"
            style={[
              styles.button,
              {
                backgroundColor: primaryColor,
              },
            ]}>
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>Incrível!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  animationContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lottie: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.sm,
    borderRadius: BorderRadiusTokens.control,
    marginBottom: SpacingTokens.lg,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  button: {
    width: '100%',
    height: ComponentHeightTokens.buttonModal,
    borderRadius: BorderRadiusTokens.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
});

