import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MomentusColors, BorderRadiusTokens, SpacingTokens } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  highlighted?: boolean;
  hero?: boolean;
  variant?: 'none' | 'compact' | 'default' | 'spacious';
  paddingVariant?: 'none' | 'compact' | 'normal' | 'hero' | 'default' | 'spacious';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  highlighted,
  hero,
  variant,
  paddingVariant = 'normal',
}) => {
  const { theme } = useMomentus();

  const activeVariant = variant || paddingVariant;

  const getPaddingStyle = () => {
    switch (activeVariant) {
      case 'none':
        return { padding: 0 };
      case 'compact':
        return { padding: SpacingTokens.md }; // 16px (Grid 8pt)
      case 'spacious':
      case 'hero':
        return { padding: SpacingTokens.xl }; // 32px (Grid 8pt)
      case 'default':
      case 'normal':
      default:
        return { padding: SpacingTokens.lg }; // 24px (Grid 8pt)
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: hero ? BorderRadiusTokens.cardHero : BorderRadiusTokens.card,
          backgroundColor: theme.surface,
          borderColor: theme.outline,
        },
        getPaddingStyle(),
        highlighted && {
          borderColor: theme.primary,
          backgroundColor: theme.surfaceElevated,
        },
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadiusTokens.card, // 16px
    borderWidth: 1,
    padding: SpacingTokens.md, // 16px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  highlightedCard: {
    borderColor: MomentusColors.emeraldNeon,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
});

