import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString } from '@/constants/initialData';
import { HabitItem } from '@/types';
import { TimePickerModal } from './TimePickerModal';

interface NewHabitModalProps {
  visible: boolean;
  onClose: () => void;
  habitToEdit?: HabitItem | null;
  initialDate?: string;
}

export const NewHabitModal: React.FC<NewHabitModalProps> = ({
  visible,
  onClose,
  habitToEdit,
  initialDate,
}) => {
  const { categories, addHabit, updateHabit, selectedDate, theme, settings } = useMomentus();
  const isEditMode = !!habitToEdit;

  const defaultGoogleSync = settings.googleCalendarSyncEnabled ?? true;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('09:00');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saveToGoogle, setSaveToGoogle] = useState(defaultGoogleSync);

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  React.useEffect(() => {
    if (habitToEdit) {
      setTitle(habitToEdit.title);
      setDescription(habitToEdit.description || '');
      setTimeStart(habitToEdit.timeStart);
      setTimeEnd(habitToEdit.timeEnd || '09:00');
      setSelectedCategoryId(habitToEdit.categoryId);
      setSaveToGoogle(!!habitToEdit.saveToGoogle);
    } else {
      setTitle('');
      setDescription('');
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const nextH = String((now.getHours() + 1) % 24).padStart(2, '0');
      setTimeStart(`${h}:00`);
      setTimeEnd(`${nextH}:00`);
      const defaultCat = categories.find((c) => c.name.toLowerCase() === 'outros') || categories[0];
      setSelectedCategoryId(defaultCat?.id || 'cat-outros');
      setSaveToGoogle(settings.googleCalendarSyncEnabled ?? true);
    }
  }, [habitToEdit, visible, categories, settings.googleCalendarSyncEnabled]);

  const parseTimeToMinutes = (t: string) => {
    if (!t) return 0;
    const parts = t.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  const isTimeInvalid = useMemo(() => {
    if (!timeStart || !timeEnd) return false;
    return parseTimeToMinutes(timeEnd) <= parseTimeToMinutes(timeStart);
  }, [timeStart, timeEnd]);

  const durationLabel = useMemo(() => {
    if (!timeStart || !timeEnd || isTimeInvalid) return null;
    const diff = parseTimeToMinutes(timeEnd) - parseTimeToMinutes(timeStart);
    if (diff <= 0) return null;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }, [timeStart, timeEnd, isTimeInvalid]);

  const isFormValid = useMemo(() => {
    return title.trim().length > 0 && !!selectedCategoryId && !isTimeInvalid;
  }, [title, selectedCategoryId, isTimeInvalid]);

  const handleSave = () => {
    if (!isFormValid) return;

    if (isEditMode && habitToEdit) {
      updateHabit({
        ...habitToEdit,
        title: title.trim(),
        description: description.trim() || undefined,
        timeStart: timeStart.trim() || '08:00',
        timeEnd: timeEnd.trim() || undefined,
        categoryId: selectedCategoryId,
        saveToGoogle,
      });
    } else {
      addHabit({
        title: title.trim(),
        description: description.trim() || undefined,
        timeStart: timeStart.trim() || '08:00',
        timeEnd: timeEnd.trim() || undefined,
        categoryId: selectedCategoryId,
        date: initialDate || selectedDate || getTodayDateString(),
        saveToGoogle,
      });
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={[styles.sheetContainer, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{isEditMode ? 'Editar Rotina' : 'Nova Rotina'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Nome da rotina *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
              placeholder="Ex: Estudo de Redes"
              placeholderTextColor={MomentusColors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Seletor Integrado de Faixa de Horário (Time Range Chip) */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Horário da Rotina</Text>
            <View
              style={[
                styles.timeRangeContainer,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: isTimeInvalid ? MomentusColors.errorRed : theme.outline,
                },
              ]}>
              {/* Bloco Início */}
              <TouchableOpacity
                style={styles.timeRangeSubBtn}
                onPress={() => setShowStartTimePicker(true)}
                activeOpacity={0.7}>
                <Text style={[styles.timeRangeSubLabel, { color: theme.textSecondary }]}>Início</Text>
                <View style={styles.timeValueRow}>
                  <Text style={[styles.timeRangeValueText, { color: theme.textPrimary }]}>{timeStart}</Text>
                  <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Seta Divisora de Fluxo */}
              <View style={styles.timeRangeArrowBox}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={isTimeInvalid ? MomentusColors.errorRed : theme.primary}
                />
              </View>

              {/* Bloco Término */}
              <TouchableOpacity
                style={styles.timeRangeSubBtn}
                onPress={() => setShowEndTimePicker(true)}
                activeOpacity={0.7}>
                <Text style={[styles.timeRangeSubLabel, { color: theme.textSecondary }]}>Término</Text>
                <View style={styles.timeValueRow}>
                  <Text style={[styles.timeRangeValueText, { color: theme.textPrimary }]}>{timeEnd}</Text>
                  <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Tag de Duração Calculada */}
              <View
                style={[
                  styles.timeRangeDurationBadge,
                  {
                    backgroundColor: isTimeInvalid ? `${MomentusColors.errorRed}15` : `${theme.primary}18`,
                    borderColor: isTimeInvalid ? `${MomentusColors.errorRed}40` : `${theme.primary}30`,
                  },
                ]}>
                <Ionicons
                  name={isTimeInvalid ? 'alert-circle' : 'hourglass-outline'}
                  size={12}
                  color={isTimeInvalid ? MomentusColors.errorRed : theme.primary}
                />
                <Text
                  style={[
                    styles.timeRangeDurationText,
                    { color: isTimeInvalid ? MomentusColors.errorRed : theme.primary },
                  ]}>
                  {isTimeInvalid ? 'Inválido' : durationLabel || '30m'}
                </Text>
              </View>
            </View>

            {/* Microvalidação sutil sem quebra de layout */}
            {isTimeInvalid && (
              <View style={styles.microErrorRow}>
                <Ionicons name="alert-circle" size={13} color={MomentusColors.errorRed} />
                <Text style={styles.microErrorText}>
                  O horário de término deve ser posterior ao início
                </Text>
              </View>
            )}

            {/* Categorias */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Categoria</Text>
            <View style={styles.categoryChips}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        borderColor: isSelected ? cat.color : theme.outline,
                        backgroundColor: isSelected ? `${cat.color}25` : theme.surfaceElevated,
                      },
                    ]}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? (theme.isDark ? '#FFF' : cat.color) : theme.textSecondary },
                      ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
              placeholder="Adicione uma descrição..."
              placeholderTextColor={MomentusColors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Google Calendar Switch */}
            <View style={[styles.googleSwitchRow, { backgroundColor: theme.surfaceElevated }]}>
              <View style={styles.googleSwitchText}>
                <Text style={[styles.googleTitle, { color: theme.textPrimary }]}>Google Agenda</Text>
                <Text style={[styles.googleSubtitle, { color: theme.textSecondary }]}>Sincronizar esta rotina</Text>
              </View>
              <Switch
                value={saveToGoogle}
                onValueChange={setSaveToGoogle}
                trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${theme.primary}66` }}
                thumbColor={saveToGoogle ? theme.primary : '#94A3B8'}
                {...({ activeThumbColor: theme.primary } as any)}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.cancelBtn,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
              ]}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: theme.primary }, !isFormValid && styles.disabledBtn]}
              disabled={!isFormValid}>
              <Text style={[styles.saveText, { color: getContrastTextColor(theme.primary) }]}>
                {isEditMode ? 'Salvar Alterações' : 'Salvar Rotina'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>

      {/* Modais de Seleção de Horário */}
      <TimePickerModal
        visible={showStartTimePicker}
        title="Hora de Início"
        initialTime={timeStart}
        onDismiss={() => setShowStartTimePicker(false)}
        onConfirm={(t) => {
          setTimeStart(t);
          setShowStartTimePicker(false);
        }}
      />

      <TimePickerModal
        visible={showEndTimePicker}
        title="Hora de Término"
        initialTime={timeEnd}
        onDismiss={() => setShowEndTimePicker(false)}
        onConfirm={(t) => {
          setTimeEnd(t);
          setShowEndTimePicker(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: MomentusColors.navyBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    marginBottom: 16,
  },
  label: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: MomentusColors.textPrimary,
    fontSize: 15,
  },
  timeInputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  errorBannerText: {
    color: MomentusColors.errorRed,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  timeBlockBtn: {
    flex: 1,
    paddingVertical: 4,
  },
  timeBlockTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeValueText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeArrowCol: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 8,
  },
  timeRangeSubBtn: {
    flex: 1,
    paddingVertical: 4,
  },
  timeRangeSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeRangeValueText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timeRangeArrowBox: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeRangeDurationText: {
    fontSize: 11,
    fontWeight: '800',
  },
  microErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  microErrorText: {
    color: MomentusColors.errorRed,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  subLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  googleSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 8,
  },
  googleSwitchText: {
    flex: 1,
  },
  googleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  googleSubtitle: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  saveText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
