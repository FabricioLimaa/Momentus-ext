import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitItem, Category } from '@/types';
import {
  MomentusColors,
  getContrastTextColor,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  IconSize,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface TimelineEventItemProps {
  item: HabitItem;
  category: Category;
  isChecked: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onCheckedChange: (checked: boolean) => void;
  onClick: () => void;
  onLongClick: () => void;
}

export const getIconForMarketItem = (id?: string | null): keyof typeof Ionicons.glyphMap | null => {
  if (!id) return null;
  switch (id) {
    case 'stk_rocket':
      return 'rocket';
    case 'stk_coffee':
      return 'cafe';
    case 'stk_zen':
      return 'fitness';
    case 'stk_bolt':
      return 'flash';
    case 'med_time':
      return 'timer';
    case 'med_streak':
      return 'flame';
    default:
      return 'cube';
  }
};

export const TimelineEventItem: React.FC<TimelineEventItemProps> = ({
  item,
  category,
  isChecked,
  isFirst = false,
  isLast = false,
  isSelected = false,
  isSelectionMode = false,
  onCheckedChange,
  onClick,
  onLongClick,
}) => {
  const { theme } = useMomentus();
  const categoryColor = category?.color || theme.primary;
  const stickerIcon = getIconForMarketItem(category?.stickerId);

  // Micro-animações hápticas fluidas (Physics Feedback: 0.92 -> 1.08 -> 1.0 + halo concêntrico)
  const useNative = Platform.OS !== 'web';
  const [checkScale] = useState(() => new Animated.Value(1));
  const [burstScale] = useState(() => new Animated.Value(0.7));
  const [burstOpacity] = useState(() => new Animated.Value(0));
  const [rowScale] = useState(() => new Animated.Value(1));
  const prevCheckedRef = useRef(isChecked);
  const pressedInternallyRef = useRef(false);

  const playElasticCheckAnimation = (checkingOn: boolean) => {
    checkScale.stopAnimation();
    rowScale.stopAnimation();

    // Sequência física elástica: contração 0.92 -> expansão elástica 1.08 -> acomodação spring 1.0
    Animated.sequence([
      Animated.timing(checkScale, {
        toValue: 0.92,
        duration: 45,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
      Animated.timing(checkScale, {
        toValue: 1.08,
        duration: 85,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        stiffness: 280,
        damping: 14,
        mass: 0.7,
        useNativeDriver: useNative,
      }),
    ]).start();

    if (checkingOn) {
      // Halo concêntrico sutil irradiando do ícone ao concluir
      burstScale.setValue(0.72);
      burstOpacity.setValue(0.55);
      Animated.parallel([
        Animated.timing(burstScale, {
          toValue: 1.6,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.sequence([
          Animated.timing(rowScale, {
            toValue: 0.992,
            duration: 55,
            useNativeDriver: useNative,
          }),
          Animated.spring(rowScale, {
            toValue: 1,
            stiffness: 260,
            damping: 18,
            mass: 0.8,
            useNativeDriver: useNative,
          }),
        ]),
      ]).start();
    }
  };

  // Reage a alterações externas de isChecked (ex.: widget nativo ou sincronização)
  useEffect(() => {
    if (prevCheckedRef.current !== isChecked) {
      prevCheckedRef.current = isChecked;
      if (pressedInternallyRef.current) {
        pressedInternallyRef.current = false;
        return;
      }
      playElasticCheckAnimation(isChecked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecked]);

  const handleCheckPressIn = () => {
    checkScale.stopAnimation();
    Animated.spring(checkScale, {
      toValue: 0.92,
      stiffness: 420,
      damping: 22,
      mass: 0.6,
      useNativeDriver: useNative,
    }).start();
  };

  const handleCheckPressOut = () => {
    if (!pressedInternallyRef.current) {
      Animated.spring(checkScale, {
        toValue: 1,
        stiffness: 300,
        damping: 16,
        mass: 0.7,
        useNativeDriver: useNative,
      }).start();
    }
  };

  const handleCheckPress = () => {
    if (isSelectionMode) {
      playElasticCheckAnimation(!isSelected);
      onClick();
    } else {
      const nextChecked = !isChecked;
      pressedInternallyRef.current = true;
      playElasticCheckAnimation(nextChecked);
      onCheckedChange(nextChecked);
    }
  };

  // Verifica se o evento está em andamento agora ou se já encerrou no passado
  const { isOngoing, isPast } = useMemo(() => {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todayYear = now.getFullYear();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

      const [startH, startM] = item.timeStart.split(':').map(Number);
      const startMinutes = startH * 60 + startM;

      let endMinutes = startMinutes + 60;
      if (item.timeEnd) {
        const [endH, endM] = item.timeEnd.split(':').map(Number);
        endMinutes = endH * 60 + endM;
      }

      const itemDate = item.date || todayStr;
      const isDateToday = itemDate === todayStr;
      const isDateBeforeToday = itemDate < todayStr;

      const ongoing = isDateToday && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      const past = isDateBeforeToday || (isDateToday && currentMinutes > endMinutes);

      return { isOngoing: ongoing, isPast: past };
    } catch {
      return { isOngoing: false, isPast: false };
    }
  }, [item.timeStart, item.timeEnd, item.date]);

  const isPastPending = isPast && !isChecked;

  const displayEndTime = useMemo(() => {
    if (item.timeEnd) return item.timeEnd;
    try {
      const [h, m] = item.timeStart.split(':').map(Number);
      const endH = (h + 1) % 24;
      return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } catch {
      return item.timeStart;
    }
  }, [item.timeStart, item.timeEnd]);

  return (
    <Animated.View style={{ transform: [{ scale: rowScale }] }}>
      <Pressable
        onPress={onClick}
        onLongPress={onLongClick}
        delayLongPress={350}
        {...(Platform.OS === 'web'
          ? {
              onContextMenu: (e: any) => {
                e.preventDefault();
                onLongClick();
              },
            }
          : {})}
        style={[
          styles.container,
          isSelected && { backgroundColor: `${theme.primary}20`, borderRadius: BorderRadiusTokens.card },
          isPastPending && !isSelected && styles.containerPastPending,
          isOngoing && !isChecked && !isSelected && {
            backgroundColor: `${theme.primary}15`,
            borderColor: theme.primary,
            borderWidth: 1.5,
            borderRadius: BorderRadiusTokens.card,
          },
          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        ]}>
        {/* 1. Horário de Início */}
        <View style={styles.timeColumn}>
          <Text
            style={[
              styles.timeText,
              { color: isOngoing ? theme.primary : theme.textSecondary },
              isOngoing && styles.timeTextOngoingBold,
            ]}>
            {item.timeStart}
          </Text>
        </View>

        {/* 2. Timeline Vertical Conectada */}
        <View style={styles.timelineColumn}>
          <View
            style={[
              styles.connectorLine,
              { backgroundColor: theme.outline },
              styles.topConnector,
              isFirst && styles.hiddenConnector,
            ]}
          />
          <View
            style={[
              styles.timelineDot,
              { backgroundColor: categoryColor, borderColor: theme.surface },
              isOngoing && !isChecked && {
                borderColor: theme.primary,
                borderWidth: 3,
                transform: [{ scale: 1.25 }],
              },
              isPastPending && styles.timelineDotPastPending,
            ]}
          />
          <View
            style={[
              styles.connectorLine,
              { backgroundColor: theme.outline },
              styles.bottomConnector,
              isLast && styles.hiddenConnector,
            ]}
          />
        </View>

        {/* 3. Card de Conteúdo */}
        <View style={styles.contentColumn}>
          <View style={styles.titleRow}>
            {stickerIcon && (
              <Ionicons
                name={stickerIcon}
                size={15}
                color={categoryColor}
                style={styles.stickerIcon}
              />
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.itemTitle,
                { color: theme.textPrimary },
                isChecked && {
                  color: theme.isDark ? 'rgba(248, 250, 252, 0.45)' : 'rgba(15, 23, 42, 0.40)',
                  textDecorationLine: 'line-through',
                },
              ]}>
              {item.title}
            </Text>

            {/* Badge "Agora" para evento em andamento */}
            {isOngoing && !isChecked && (
              <View
                style={[
                  styles.ongoingBadge,
                  {
                    backgroundColor: `${theme.primary}20`,
                    borderColor: theme.primary,
                  },
                ]}>
                <View style={[styles.ongoingPulseDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.ongoingBadgeText, { color: theme.primary }]}>
                  Agora
                </Text>
              </View>
            )}

            {/* Badge "Pendente" para eventos passados não concluídos */}
            {isPastPending && (
              <View
                style={[
                  styles.pastPendingBadge,
                  {
                    backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                    borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
                  },
                ]}>
                <Ionicons
                  name="time-outline"
                  size={IconSize.xs}
                  color={MomentusColors.errorRed}
                  style={styles.pastPendingIcon}
                />
                <Text style={[styles.pastPendingText, { color: MomentusColors.errorRed }]}>
                  Pendente
                </Text>
              </View>
            )}

            {/* Chip de Categoria */}
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {category?.name || 'Geral'}
              </Text>
            </View>

            {/* Indicador do Google Agenda */}
            {(item.isFromGoogleCalendar || item.saveToGoogle || !!item.googleCalendarEventId) && (
              <View style={styles.googleIconBadge}>
                <Ionicons name="logo-google" size={11} color="#4285F4" />
              </View>
            )}
          </View>

          <Text style={[styles.timeRangeText, { color: theme.textSecondary }]}>
            {item.timeStart} - {displayEndTime}
          </Text>
        </View>

        {/* 4. Status Check / Modo de Seleção com Física Elástica */}
        <Pressable
          onPressIn={handleCheckPressIn}
          onPressOut={handleCheckPressOut}
          onPress={handleCheckPress}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelectionMode ? isSelected : isChecked }}
          accessibilityLabel={
            isSelectionMode
              ? `Selecionar ${item.title}`
              : isChecked
                ? `Desmarcar conclusão de ${item.title}`
                : `Concluir ${item.title}`
          }
          style={[
            styles.checkContainer,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}>
          {/* Halo concêntrico sutil emitido na conclusão */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.checkBurstRing,
              {
                borderColor: theme.primary,
                opacity: burstOpacity,
                transform: [{ scale: burstScale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.checkIconWrapper,
              { transform: [{ scale: checkScale }] },
            ]}>
            {isSelectionMode ? (
              <View
                style={[
                  styles.checkboxBox,
                  { borderColor: theme.outline },
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color={getContrastTextColor(theme.primary)} />
                )}
              </View>
            ) : isChecked ? (
              <Ionicons name="checkmark-circle" size={IconSize.lg} color={theme.primary} />
            ) : (
              <View style={[styles.uncheckCircle, { borderColor: theme.outline }]} />
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: SpacingTokens.md,
    minHeight: 64,
  },
  containerPastPending: {
    opacity: 0.65,
  },
  containerSelected: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: BorderRadiusTokens.control,
  },
  timeColumn: {
    width: 56,
    paddingTop: SpacingTokens.md,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textSecondary,
  },
  timeTextOngoing: {
    color: MomentusColors.emeraldNeon,
  },
  timeTextOngoingBold: {
    fontWeight: '800',
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  topConnector: {
    height: 16,
  },
  bottomConnector: {
    flex: 1,
    minHeight: 24,
  },
  hiddenConnector: {
    backgroundColor: 'transparent',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: MomentusColors.navyBackground,
  },
  timelineDotPastPending: {
    opacity: 0.6,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: SpacingTokens.md,
    paddingTop: SpacingTokens.sm,
    paddingBottom: SpacingTokens.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  stickerIcon: {
    marginRight: SpacingTokens.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  itemTitleChecked: {
    color: 'rgba(248, 250, 252, 0.45)',
    textDecorationLine: 'line-through',
  },
  categoryBadge: {
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.sm,
    marginLeft: SpacingTokens.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRangeText: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    marginTop: SpacingTokens.xs,
  },
  checkContainer: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  checkIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBurstRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  uncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadiusTokens.sm,
    borderWidth: 2,
    borderColor: MomentusColors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: MomentusColors.emeraldNeon,
    borderColor: MomentusColors.emeraldNeon,
  },
  googleIconBadge: {
    marginLeft: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.xs,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.xs,
    backgroundColor: 'rgba(66, 133, 244, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ongoingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.xs,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.xs,
    borderWidth: 1,
    marginLeft: SpacingTokens.xs,
  },
  ongoingPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SpacingTokens.xs,
  },
  ongoingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pastPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.xs,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.xs,
    borderWidth: 1,
    marginLeft: SpacingTokens.xs,
  },
  pastPendingIcon: {
    marginRight: 2,
  },
  pastPendingText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
