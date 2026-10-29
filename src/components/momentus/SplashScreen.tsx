import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';

interface SplashScreenProps {
  syncMessage?: string;
  progress?: number;
  isReady?: boolean;
}

export function SplashScreen({
  syncMessage = 'Carregando suas rotinas...',
  progress,
  isReady = false,
}: SplashScreenProps) {
  // Animação contínua de pulso do Glow verde
  const [glowScale] = useState(() => new Animated.Value(1));
  const [glowAlpha] = useState(() => new Animated.Value(0.25));

  // Animação de entrada (Fade in e subida sutil)
  const [entryFade] = useState(() => new Animated.Value(0));
  const [entryTranslateY] = useState(() => new Animated.Value(20));

  // Animação do Checkmark de sucesso quando pronto
  const [checkScale] = useState(() => new Animated.Value(0.7));

  useEffect(() => {
    // Loop de pulso suave
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.3,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAlpha, {
            toValue: 0.55,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAlpha, {
            toValue: 0.2,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();

    // Fade-in e subida dos elementos
    Animated.parallel([
      Animated.timing(entryFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(entryTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      pulseLoop.stop();
    };
  }, [glowAlpha, glowScale, entryFade, entryTranslateY]);

  useEffect(() => {
    if (isReady) {
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady, checkScale]);

  const hasProgress = typeof progress === 'number';
  const clampedProgress = hasProgress ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <LinearGradient
      colors={[MomentusColors.navyBackground, '#000000']}
      style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: entryFade,
            transform: [{ translateY: entryTranslateY }],
          },
        ]}>
        {/* Glow Verde Circular e Símbolo Oficial da Marca */}
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.glowCircle,
              {
                transform: [{ scale: glowScale }],
                opacity: glowAlpha,
              },
            ]}
          />
          <View style={styles.brandBadge}>
            <Image
              source={require('@/../assets/images/brand/symbol-transparent.png')}
              style={styles.brandSymbolImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Título e Subtítulo */}
        <Text style={styles.brandTitle}>Momentus</Text>
        <Text style={styles.brandSubtitle}>
          Organize suas metas, conquiste seu dia.
        </Text>

        {/* Barra de Progresso Fluida (Sugestão B) */}
        {hasProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${clampedProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentText}>{Math.round(clampedProgress)}%</Text>
          </View>
        )}

        {/* Status de Sincronização & Feedback de Sucesso */}
        <View style={[styles.syncContainer, isReady && styles.syncContainerReady]}>
          {isReady ? (
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={MomentusColors.emeraldNeon}
              />
            </Animated.View>
          ) : (
            <ActivityIndicator
              size="small"
              color={MomentusColors.emeraldNeon}
              style={styles.spinner}
            />
          )}
          <Text style={[styles.syncText, isReady && styles.syncTextReady]}>
            {syncMessage}
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MomentusColors.navyBackground,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 400,
    width: '100%',
  },
  logoWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: MomentusColors.emeraldNeon,
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 16,
  },
  brandBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  brandSymbolImg: {
    width: 60,
    height: 38,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
    lineHeight: 20,
  },
  progressSection: {
    width: '100%',
    maxWidth: 240,
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: MomentusColors.emeraldNeon,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: MomentusColors.emeraldNeon,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    maxWidth: '100%',
  },
  syncContainerReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: MomentusColors.emeraldNeon,
  },
  spinner: {
    transform: [{ scale: 0.85 }],
  },
  syncText: {
    fontSize: 12,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
    letterSpacing: 0.3,
  },
  syncTextReady: {
    color: MomentusColors.emeraldNeon,
  },
});
