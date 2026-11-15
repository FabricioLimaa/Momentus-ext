import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitItem, Category } from '@/types';
import {
  MomentusColors,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  getContrastTextColor,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface HabitItemCardProps {
  habit: HabitItem;
  category?: Category;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const HabitItemCard: React.FC<HabitItemCardProps> = ({
  habit,
  category,
  onToggle,
  onDelete,
}) => {
  const { theme } = useMomentus();

  return (
    <Pressable
      onPress={() => onToggle(habit.id)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.outline },
        habit.completed && { opacity: 0.7, backgroundColor: theme.surfaceElevated },
        pressed && styles.pressed,
      ]}>
      {/* Checkbox Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onToggle(habit.id)}
        style={[
          styles.checkbox,
          { borderColor: theme.outline },
          habit.completed && { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}>
        {habit.completed && (
          <Ionicons name="checkmark" size={16} color={getContrastTextColor(theme.primary)} />
        )}
      </TouchableOpacity>

      {/* Main Info */}
      <View style={styles.infoCol}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: habit.completed ? theme.textSecondary : theme.textPrimary },
              habit.completed && styles.titleCompleted,
            ]}
            numberOfLines={1}>
            {habit.title}
          </Text>
          {habit.streak > 0 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={11} color={MomentusColors.fireStreak} />
              <Text style={styles.streakText}>{habit.streak}d</Text>
            </View>
          )}
        </View>

        {habit.description ? (
          <Text
            style={[styles.description, { color: theme.textSecondary }, habit.completed && styles.descCompleted]}
            numberOfLines={2}>
            {habit.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {category && (
            <View
              style={[
                styles.categoryTag,
                { backgroundColor: `${category.color}20`, borderColor: category.color },
              ]}>
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={[styles.categoryName, { color: category.color }]}>
                {category.name}
              </Text>
            </View>
          )}

          <View style={styles.timeTag}>
            <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {habit.timeStart}
              {habit.timeEnd ? ` - ${habit.timeEnd}` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Delete Action */}
      <TouchableOpacity
        onPress={() => onDelete(habit.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={16} color={MomentusColors.textMuted} />
      </TouchableOpacity>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.7,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  pressed: {
    opacity: 0.85,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadiusTokens.sm,
    borderWidth: 2,
    borderColor: MomentusColors.navyOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: MomentusColors.emeraldNeon,
    borderColor: MomentusColors.emeraldNeon,
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SpacingTokens.xs,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: SpacingTokens.sm,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: MomentusColors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.sm,
    gap: 2,
  },
  streakText: {
    color: MomentusColors.fireStreak,
    fontSize: 11,
    fontWeight: 'bold',
  },
  description: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    marginBottom: SpacingTokens.sm,
    lineHeight: 18,
  },
  descCompleted: {
    color: MomentusColors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SpacingTokens.sm,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.sm,
    borderWidth: 1,
    gap: SpacingTokens.xs,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  timeText: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

