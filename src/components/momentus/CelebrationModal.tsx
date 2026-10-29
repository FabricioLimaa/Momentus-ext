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
import { MomentusColors } from '@/constants/theme';
import { soundManager } from '@/util/soundManager';

interface CelebrationModalProps {
  visible: boolean;
  title: string;
  message: string;
  pointsEarned?: number;
  isDark?: boolean;
  primaryColor?: string;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  visible,
  title,
  message,
  pointsEarned,
  isDark = true,
  primaryColor = MomentusColors.emeraldNeon,
  onClose,
}) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      soundManager.playAchievementSound();
      animationRef.current?.play();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? MomentusColors.navySurface : '#FFFFFF',
              borderColor: isDark ? MomentusColors.navyOutline : '#E2E8F0',
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
          <Text
            style={[
              styles.title,
              { color: isDark ? MomentusColors.textPrimary : '#0F172A' },
            ]}>
            {title}
          </Text>

          <Text
            style={[
              styles.message,
              { color: isDark ? MomentusColors.textSecondary : '#64748B' },
            ]}>
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
                color={isDark ? MomentusColors.textSecondary : '#64748B'}
              />
              <Text
                style={[
                  styles.pointsText,
                  { color: isDark ? MomentusColors.textSecondary : '#64748B' },
                ]}>
                XP diário já validado anteriormente
              </Text>
            </View>
          ) : null}

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={[
              styles.button,
              {
                backgroundColor: primaryColor,
              },
            ]}>
            <Text style={styles.buttonText}>Incrível!</Text>
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
});

