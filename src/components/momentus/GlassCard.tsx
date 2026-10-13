import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MomentusColors } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, highlighted }) => {
  return (
    <View
      style={[
        styles.card,
        highlighted && styles.highlightedCard,
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  highlightedCard: {
    borderColor: MomentusColors.emeraldNeon,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
});

