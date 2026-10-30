import React from 'react';
import { View, Image, Text, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { UserLevelInfo } from '@/domain/userLevel';

export type AvatarFrameType = 'frame_emerald' | 'frame_cyan' | 'frame_gold';

export interface AvatarFrameDefinition {
  id: AvatarFrameType;
  name: string;
  borderColor: string;
  glowColor: string;
  borderWidth: number;
  description: string;
  isUnlocked: (params: { level: number; totalFocusMinutes: number; currentStreak: number; bestStreak: number }) => boolean;
  unlockRequirementText: string;
}

export const AVATAR_FRAMES: AvatarFrameDefinition[] = [
  {
    id: 'frame_emerald',
    name: 'Borda Esmeralda Neon',
    borderColor: '#34D399',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    borderWidth: 2.5,
    description: 'Moldura de boas-vindas para todo realizador consistente.',
    isUnlocked: () => true, // Sempre desbloqueada
    unlockRequirementText: 'Padrão Inicial',
  },
  {
    id: 'frame_cyan',
    name: 'Borda Ciano Futurista',
    borderColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.55)',
    borderWidth: 3,
    description: 'Moldura de alta tecnologia para mestres da concentração.',
    isUnlocked: ({ totalFocusMinutes }) => totalFocusMinutes >= 500,
    unlockRequirementText: '500 min de foco acumulados',
  },
  {
    id: 'frame_gold',
    name: 'Borda Dourada Imperial',
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    borderWidth: 3.5,
    description: 'Moldura lendária reservada aos maiores mestres da consistência.',
    isUnlocked: ({ level, currentStreak, bestStreak }) => level >= 15 || currentStreak >= 10 || bestStreak >= 10,
    unlockRequirementText: 'Nível 15 ou Sequência de 10 dias',
  },
];

interface AvatarWithFrameProps {
  photoUrl?: string | null;
  name?: string | null;
  size?: number;
  frameId?: AvatarFrameType | null;
  userLevel?: UserLevelInfo | null;
  totalFocusMinutes?: number;
  currentStreak?: number;
  bestStreak?: number;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackInitial?: string;
  onError?: () => void;
}

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  photoUrl,
  name,
  size = 54,
  frameId,
  userLevel,
  totalFocusMinutes = 0,
  currentStreak = 0,
  bestStreak = 0,
  containerStyle,
  fallbackInitial,
  onError,
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Determina a moldura ativa: se passada explicitamente, ou calculada conforme o nível/progresso
  const activeFrame = React.useMemo(() => {
    if (frameId) {
      const found = AVATAR_FRAMES.find((f) => f.id === frameId);
      if (found) return found;
    }

    const lvl = userLevel?.level || 1;
    // Auto-equip conforme progressão caso não tenha seleção customizada
    if (lvl >= 15 || currentStreak >= 10 || bestStreak >= 10) {
      return AVATAR_FRAMES[2]; // Ouro
    }
    if (totalFocusMinutes >= 500) {
      return AVATAR_FRAMES[1]; // Ciano
    }
    return AVATAR_FRAMES[0]; // Esmeralda Padrão
  }, [frameId, userLevel?.level, totalFocusMinutes, currentStreak, bestStreak]);

  const initial = (fallbackInitial || name?.charAt(0) || 'U').toUpperCase();
  const radius = size / 2;

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size + 6,
          height: size + 6,
          borderRadius: radius + 3,
          borderColor: activeFrame.borderColor,
          borderWidth: activeFrame.borderWidth,
          shadowColor: activeFrame.borderColor,
          shadowOpacity: 0.45,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 5,
        },
        containerStyle,
      ]}>
      <View
        style={[
          styles.innerCircle,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: `${activeFrame.borderColor}15`,
          },
        ]}>
        {photoUrl && !imageError ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: size, height: size, borderRadius: radius }}
            resizeMode="cover"
            onError={() => {
              setImageError(true);
              onError?.();
            }}
            {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } : {})}
          />
        ) : (
          <Text
            style={[
              styles.initialText,
              {
                fontSize: Math.round(size * 0.44),
                color: activeFrame.borderColor,
              },
            ]}>
            {initial}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontWeight: '900',
  },
});

