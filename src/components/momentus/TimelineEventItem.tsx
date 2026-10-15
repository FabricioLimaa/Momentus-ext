import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitItem, Category } from '@/types';
import { MomentusColors } from '@/constants/theme';

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
  const categoryColor = category?.color || '#34D399';
  const stickerIcon = getIconForMarketItem(category?.stickerId);

  // Verifica se o evento está em andamento agora
  const isOngoing = useMemo(() => {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = item.timeStart.split(':').map(Number);
      const startMinutes = startH * 60 + startM;

      let endMinutes = startMinutes + 60;
      if (item.timeEnd) {
        const [endH, endM] = item.timeEnd.split(':').map(Number);
        endMinutes = endH * 60 + endM;
      }

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return false;
    }
  }, [item.timeStart, item.timeEnd]);

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
    <Pressable
      onPress={onClick}
      onLongPress={onLongClick}
      delayLongPress={350}
      style={[
        styles.container,
        isSelected && styles.containerSelected,
      ]}>
      {/* 1. Horário de Início */}
      <View style={styles.timeColumn}>
        <Text
          style={[
            styles.timeText,
            isOngoing && styles.timeTextOngoing,
          ]}>
          {item.timeStart}
        </Text>
      </View>

      {/* 2. Timeline Vertical Conectada */}
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.connectorLine,
            styles.topConnector,
            isFirst && styles.hiddenConnector,
          ]}
        />
        <View style={[styles.timelineDot, { backgroundColor: categoryColor }]} />
        <View
          style={[
            styles.connectorLine,
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
              isChecked && styles.itemTitleChecked,
            ]}>
            {item.title}
          </Text>

          {/* Chip de Categoria */}
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
            <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
              {category?.name || 'Geral'}
            </Text>
          </View>
        </View>

        <Text style={styles.timeRangeText}>
          {item.timeStart} - {displayEndTime}
        </Text>
      </View>

      {/* 4. Status Check / Modo de Seleção */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isSelectionMode) {
            onClick();
          } else {
            onCheckedChange(!isChecked);
          }
        }}
        style={styles.checkContainer}>
        {isSelectionMode ? (
          <View
            style={[
              styles.checkboxBox,
              isSelected && styles.checkboxBoxSelected,
            ]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#0F172A" />}
          </View>
        ) : isChecked ? (
          <Ionicons name="checkmark-circle" size={24} color={MomentusColors.emeraldNeon} />
        ) : (
          <View style={styles.uncheckCircle} />
        )}
      </TouchableOpacity>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    minHeight: 64,
  },
  containerSelected: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderRadius: 12,
  },
  timeColumn: {
    width: 52,
    paddingTop: 14,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textSecondary,
  },
  timeTextOngoing: {
    color: MomentusColors.emeraldNeon,
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
    height: 18,
  },
  bottomConnector: {
    flex: 1,
    minHeight: 28,
  },
  hiddenConnector: {
    backgroundColor: 'transparent',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: MomentusColors.navyBackground,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 10,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  stickerIcon: {
    marginRight: 6,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeRangeText: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    marginTop: 4,
  },
  checkContainer: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 6,
  },
  uncheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: MomentusColors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxSelected: {
    backgroundColor: MomentusColors.emeraldNeon,
    borderColor: MomentusColors.emeraldNeon,
  },
});
