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
import { MomentusColors } from '@/constants/theme';

interface SplashScreenProps {
  syncMessage?: string;
}

export function SplashScreen({ syncMessage = 'Carregando suas rotinas...' }: SplashScreenProps) {
  // Animação contínua de pulso do Glow verde
  const [glowScale] = useState(() => new Animated.Value(1));
  const [glowAlpha] = useState(() => new Animated.Value(0.25));

  // Animação de entrada (Fade in e subida sutil)
  const [entryFade] = useState(() => new Animated.Value(0));
  const [entryTranslateY] = useState(() => new Animated.Value(25));

  useEffect(() => {
    // Loop de pulso suave
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.35,
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
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(entryTranslateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      pulseLoop.stop();
    };
  }, [glowAlpha, glowScale, entryFade, entryTranslateY]);

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
        {/* Glow Verde Circular e Logo */}
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
          <Image
            source={require('@/../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Título e Subtítulo */}
        <Text style={styles.brandTitle}>Momentus</Text>
        <Text style={styles.brandSubtitle}>
          Organize suas metas, conquiste seu dia.
        </Text>

        {/* Status de Sincronização Discreto */}
        <View style={styles.syncContainer}>
          <ActivityIndicator
            size="small"
            color={MomentusColors.emeraldNeon}
            style={styles.spinner}
          />
          <Text style={styles.syncText}>
            {syncMessage.toUpperCase()}
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
  },
  logoWrapper: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 28,
  },
  glowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: MomentusColors.emeraldNeon,
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 20,
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 28,
    zIndex: 2,
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
    fontSize: 15,
    color: MomentusColors.textSecondary,
    textAlign: 'center',
    marginBottom: 50,
    fontWeight: '500',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  spinner: {
    transform: [{ scale: 0.85 }],
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: MomentusColors.emeraldNeon,
  },
});
