import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitItem, Category } from '@/types';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getIconForMarketItem } from './TimelineEventItem';
import { formatDateToBr } from '@/constants/initialData';

interface EventDetailDialogProps {
  visible: boolean;
  event: HabitItem | null;
  category?: Category;
  onDismiss: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export const EventDetailDialog: React.FC<EventDetailDialogProps> = ({
  visible,
  event,
  category,
  onDismiss,
  onEditClick,
  onDeleteClick,
}) => {
  const { theme, templates } = useMomentus();
  if (!event) return null;

  const categoryColor = category?.color || MomentusColors.emeraldNeon;
  const stickerIcon = getIconForMarketItem(category?.stickerId);

  const sourceTemplate = templates.find(
    (t) =>
      t.id === event.templateSourceId ||
      event.id.startsWith(`applied_${t.id}_`)
  );
  const isFromTemplate = Boolean(event.templateSourceId || sourceTemplate || event.id.startsWith('applied_'));

  const displayEndTime = event.timeEnd || (() => {
    try {
      const [h, m] = event.timeStart.split(':').map(Number);
      return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } catch {
      return event.timeStart;
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Header: Ícone da Categoria + "Detalhes da Atividade" */}
            <View style={styles.headerRow}>
              <View style={[styles.headerIconContainer, { backgroundColor: `${categoryColor}15` }]}>
                <Ionicons
                  name={stickerIcon || 'information-circle-outline'}
                  size={20}
                  color={categoryColor}
                />
              </View>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Detalhes da Atividade</Text>
            </View>

            {/* 2. Título da Tarefa */}
            <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{event.title}</Text>

            {/* 3. Categoria em Chip e Origem */}
            <View style={styles.categoryBadgeRow}>
              <View style={[styles.categoryChip, { backgroundColor: `${categoryColor}15` }]}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.categoryChipText, { color: categoryColor }]}>
                  {category?.name || 'Geral'}
                </Text>
              </View>

              {isFromTemplate && (
                <View
                  style={[
                    styles.templateOriginChip,
                    {
                      backgroundColor: `${theme.primary}15`,
                      borderColor: `${theme.primary}40`,
                    },
                  ]}>
                  <Ionicons name="copy-outline" size={12} color={theme.primary} />
                  <Text style={[styles.templateOriginChipText, { color: theme.primary }]}>
                    {sourceTemplate ? sourceTemplate.title : 'De Template'}
                  </Text>
                </View>
              )}
            </View>

            {/* 4. Data e Horário */}
            {!!event.date && (
              <View style={[styles.timeRow, { marginBottom: 6 }]}>
                <View style={[styles.timeIconBox, { backgroundColor: `${theme.primary}15` }]}>
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                </View>
                <Text style={[styles.timeText, { color: theme.textPrimary }]}>
                  {formatDateToBr(event.date)}
                </Text>
              </View>
            )}

            <View style={styles.timeRow}>
              <View style={[styles.timeIconBox, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="time-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.timeText, { color: theme.textPrimary }]}>
                {event.timeStart} às {displayEndTime}
              </Text>
            </View>

            {/* 5. Descrição / Notas */}
            {!!event.description && (
              <View style={[styles.descriptionBox, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{event.description}</Text>
              </View>
            )}

            {/* Google Calendar status se aplicável */}
            {event.saveToGoogle && (
              <View style={styles.googleSyncRow}>
                <Ionicons name="logo-google" size={14} color={theme.primary} />
                <Text style={[styles.googleSyncText, { color: theme.primary }]}>Sincronizado com Google Agenda</Text>
              </View>
            )}

            {/* 6. Ações */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.iconButtonError}
                onPress={onDeleteClick}
                activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color={MomentusColors.errorRed} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButtonPrimary, { backgroundColor: `${theme.primary}15` }]}
                onPress={onEditClick}
                activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={20} color={theme.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.primary }]}
                onPress={onDismiss}
                activeOpacity={0.8}>
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MomentusColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
    marginBottom: 16,
    lineHeight: 28,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  templateOriginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  templateOriginChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: MomentusColors.textPrimary,
  },
  descriptionBox: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: MomentusColors.textSecondary,
  },
  googleSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  googleSyncText: {
    fontSize: 12,
    color: MomentusColors.emeraldNeon,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  iconButtonError: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonPrimary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  closeButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
});

