import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useMomentus } from '@/context/MomentusContext';

interface CircularProgressRingProps {
  progress: number; // 0.0 to 1.0
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showText?: boolean;
}

interface AnimatedPercentLabelProps {
  animatedProgress: Animated.Value;
  initialPercent: number;
  color: string;
}

const AnimatedPercentLabel: React.FC<AnimatedPercentLabelProps> = ({
  animatedProgress,
  initialPercent,
  color,
}) => {
  const [displayPercent, setDisplayPercent] = useState(initialPercent);
  const lastPercentRef = useRef(initialPercent);

  useEffect(() => {
    const id = animatedProgress.addListener(({ value }) => {
      const clamped = Math.min(1, Math.max(0, value));
      const next = Math.round(clamped * 100);
      if (next !== lastPercentRef.current) {
        lastPercentRef.current = next;
        setDisplayPercent(next);
      }
    });

    return () => {
      animatedProgress.removeListener(id);
    };
  }, [animatedProgress]);

  return (
    <View style={styles.textContainer}>
      <Text style={[styles.percentageText, { color }]}>{displayPercent}%</Text>
    </View>
  );
};

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 7,
  color,
  trackColor,
  showText = true,
}) => {
  const { theme } = useMomentus();

  const primaryColor = color || theme.primary;
  const secondaryTrackColor =
    trackColor || (theme.isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)');

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, Number.isNaN(progress) ? 0 : progress));
  const center = size / 2;
  const useNative = Platform.OS !== 'web';

  const [initialProgress] = useState(() => clampedProgress);
  const [animatedProgress] = useState(() => new Animated.Value(clampedProgress));
  const [ringScale] = useState(() => new Animated.Value(1));
  const [haloScale] = useState(() => new Animated.Value(0.88));
  const [haloOpacity] = useState(() => new Animated.Value(0));

  const circleRef = useRef<any>(null);
  const currentProgressRef = useRef(clampedProgress);
  const prevTargetRef = useRef(clampedProgress);

  // Listener cross-platform (iOS, Android e Web) sincronizado ao solver Spring
  useEffect(() => {
    const applyArcProps = (rawValue: number) => {
      const safeVal = Math.min(1, Math.max(0, rawValue));
      currentProgressRef.current = safeVal;
      const nextOffset = circumference * (1 - safeVal);
      const nextOpacity = safeVal <= 0.004 ? 0 : Math.min(1, safeVal / 0.02);

      if (circleRef.current?.setNativeProps) {
        if (Platform.OS === 'web') {
          // react-native-svg WebShape.setNativeProps aplica atributos de props.style
          circleRef.current.setNativeProps({
            style: {
              strokeDashoffset: nextOffset,
              strokeOpacity: nextOpacity,
            },
          });
        } else {
          circleRef.current.setNativeProps({
            strokeDashoffset: nextOffset,
            strokeOpacity: nextOpacity,
          });
        }
      }
    };

    const listenerId = animatedProgress.addListener(({ value }) => {
      applyArcProps(value);
    });

    // Garante estado inicial consistente caso o tamanho/circunferência mude
    applyArcProps(currentProgressRef.current);

    return () => {
      animatedProgress.removeListener(listenerId);
    };
  }, [animatedProgress, circumference]);

  // Física fluida (Spring animation) sempre que o progresso muda
  useEffect(() => {
    const prevTarget = prevTargetRef.current;
    if (prevTarget === clampedProgress) return;

    const didIncrease = clampedProgress > prevTarget;
    const hitFullCompletion = clampedProgress >= 1 && prevTarget < 1;
    prevTargetRef.current = clampedProgress;

    animatedProgress.stopAnimation();
    Animated.spring(animatedProgress, {
      toValue: clampedProgress,
      stiffness: 115,
      damping: 14,
      mass: 0.9,
      overshootClamping: false,
      useNativeDriver: false,
    }).start();

    // Micro-impulso elástico no anel quando o usuário avança ou completa 100%
    if (didIncrease) {
      ringScale.stopAnimation();
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: hitFullCompletion ? 1.09 : 1.045,
          duration: 110,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          stiffness: 240,
          damping: 13,
          mass: 0.75,
          useNativeDriver: useNative,
        }),
      ]).start();

      if (hitFullCompletion) {
        haloScale.setValue(0.88);
        haloOpacity.setValue(0.5);
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 1.28,
            duration: 460,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: useNative,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 460,
            easing: Easing.out(Easing.quad),
            useNativeDriver: useNative,
          }),
        ]).start();
      }
    }
  }, [animatedProgress, clampedProgress, haloOpacity, haloScale, ringScale, useNative]);

  const initialDashOffset = circumference * (1 - initialProgress);
  const initialStrokeOpacity = initialProgress <= 0.004 ? 0 : Math.min(1, initialProgress / 0.02);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: ringScale }],
        },
      ]}>
      {/* Halo de celebração sutil ao atingir 100% */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.completionHalo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: primaryColor,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />

      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G transform={`rotate(-90 ${center} ${center})`}>
          {/* Track (background ring) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={secondaryTrackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Active progress arc (dirigido via Spring Physics) */}
          <Circle
            ref={circleRef}
            cx={center}
            cy={center}
            r={radius}
            stroke={primaryColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={initialDashOffset}
            strokeOpacity={initialStrokeOpacity}
            strokeLinecap="round"
            fill="transparent"
          />
        </G>
      </Svg>

      {showText && (
        <AnimatedPercentLabel
          animatedProgress={animatedProgress}
          initialPercent={Math.round(initialProgress * 100)}
          color={theme.textPrimary}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  completionHalo: {
    position: 'absolute',
    borderWidth: 2,
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
