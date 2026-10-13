import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitItem, Category } from '@/types';
import { MomentusColors } from '@/constants/theme';

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
  return (
    <Pressable
      onPress={() => onToggle(habit.id)}
      style={({ pressed }) => [
        styles.card,
        habit.completed && styles.cardCompleted,
        pressed && styles.pressed,
      ]}>
      {/* Checkbox Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onToggle(habit.id)}
        style={[styles.checkbox, habit.completed && styles.checkboxCompleted]}>
        {habit.completed && <Ionicons name="checkmark" size={16} color="#FFF" />}
      </TouchableOpacity>

      {/* Main Info */}
      <View style={styles.infoCol}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, habit.completed && styles.titleCompleted]}
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
            style={[styles.description, habit.completed && styles.descCompleted]}
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
            <Ionicons name="time-outline" size={12} color={MomentusColors.textSecondary} />
            <Text style={styles.timeText}>
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
    marginBottom: 4,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: MomentusColors.textSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
    marginBottom: 8,
    lineHeight: 18,
  },
  descCompleted: {
    color: MomentusColors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
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
    gap: 4,
  },
  timeText: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 6,
  },
});

