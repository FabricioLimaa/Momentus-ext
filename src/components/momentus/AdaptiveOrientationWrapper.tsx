import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LayoutTokens } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface AdaptiveOrientationWrapperProps {
  children: React.ReactNode;
  maxWidth?: number;
}

/**
 * AdaptiveOrientationWrapper
 * Garante ergonomia visual em qualquer formato de tela:
 * - Em smartphones (< 680px): Ocupa 100% da largura com layout nativo vertical.
 * - Em tablets, iPads e Web (> 680px): Centraliza o contêiner mestre com largura máxima proporcional (LayoutTokens.maxContentWidth), evitando distorções visuais e fadiga ocular.
 */
export function AdaptiveOrientationWrapper({
  children,
  maxWidth = LayoutTokens.maxDesktopContentWidth,
}: AdaptiveOrientationWrapperProps) {
  const { width } = useWindowDimensions();
  const { theme } = useMomentus();
  const isWidescreen = width > maxWidth;

  return (
    <View
      style={[
        styles.outerContainer,
        { backgroundColor: theme.background },
      ]}>
      <View
        style={[
          styles.innerContainer,
          isWidescreen && {
            maxWidth,
            alignSelf: 'center',
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
