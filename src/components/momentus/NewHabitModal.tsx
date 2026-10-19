import React, { useState } from 'react';
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
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString } from '@/constants/initialData';
import { HabitItem } from '@/types';

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
  const { categories, addHabit, updateHabit, selectedDate, theme } = useMomentus();
  const isEditMode = !!habitToEdit;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('09:00');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saveToGoogle, setSaveToGoogle] = useState(false);

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
      setSaveToGoogle(false);
    }
  }, [habitToEdit, visible, categories]);

  const handleSave = () => {
    if (!title.trim() || !selectedCategoryId) return;

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

            {/* Horários */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Horário</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Início</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
                  placeholder="08:00"
                  placeholderTextColor={MomentusColors.textMuted}
                  value={timeStart}
                  onChangeText={setTimeStart}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Fim</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
                  placeholder="09:00"
                  placeholderTextColor={MomentusColors.textMuted}
                  value={timeEnd}
                  onChangeText={setTimeEnd}
                />
              </View>
            </View>

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
                trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: 'rgba(52, 211, 153, 0.4)' }}
                thumbColor={saveToGoogle ? theme.primary : '#94A3B8'}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: theme.primary }, !title.trim() && styles.disabledBtn]}
              disabled={!title.trim()}>
              <Text style={styles.saveText}>
                {isEditMode ? 'Salvar Alterações' : 'Salvar Rotina'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
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
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCol: {
    flex: 1,
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
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    alignItems: 'center',
  },
  cancelText: {
    color: MomentusColors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: MomentusColors.emeraldNeon,
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


