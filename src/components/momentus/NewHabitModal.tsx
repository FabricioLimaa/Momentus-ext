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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString } from '@/constants/initialData';

interface NewHabitModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NewHabitModal: React.FC<NewHabitModalProps> = ({ visible, onClose }) => {
  const { categories, addHabit } = useMomentus();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('08:30');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id || 'cat-saude'
  );

  const handleSave = () => {
    if (!title.trim()) return;

    addHabit({
      title: title.trim(),
      description: description.trim() || undefined,
      timeStart: timeStart || '08:00',
      timeEnd: timeEnd.trim() || undefined,
      categoryId: selectedCategoryId,
      date: getTodayDateString(),
    });

    setTitle('');
    setDescription('');
    setTimeStart('08:00');
    setTimeEnd('08:30');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Nova Rotina / Hábito</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={MomentusColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.label}>Título da Atividade *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Treino de pernas, Leitura..."
              placeholderTextColor={MomentusColors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>Descrição / Notas (Opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: 3 séries até a falha, focar na técnica"
              placeholderTextColor={MomentusColors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Horários */}
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Início</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  placeholderTextColor={MomentusColors.textMuted}
                  value={timeStart}
                  onChangeText={setTimeStart}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Término</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08:30"
                  placeholderTextColor={MomentusColors.textMuted}
                  value={timeEnd}
                  onChangeText={setTimeEnd}
                />
              </View>
            </View>

            {/* Categorias */}
            <Text style={styles.label}>Categoria</Text>
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
                        borderColor: isSelected ? cat.color : MomentusColors.navyOutline,
                        backgroundColor: isSelected ? `${cat.color}25` : MomentusColors.navySurface,
                      },
                    ]}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#FFF' : MomentusColors.textSecondary },
                      ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, !title.trim() && styles.disabledBtn]}
              disabled={!title.trim()}>
              <Text style={styles.saveText}>Criar Hábito</Text>
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

