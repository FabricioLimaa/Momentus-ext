import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const clampedProgress = Math.min(1, Math.max(0, isNaN(progress) ? 0 : progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const center = size / 2;

  const percentage = Math.round(clampedProgress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
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

          {/* Active progress arc */}
          {clampedProgress > 0 && (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={primaryColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          )}
        </G>
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.percentageText, { color: theme.textPrimary }]}>
            {percentage}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
