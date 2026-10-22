import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { GOOGLE_CALENDAR_COLORS } from '@/constants/initialData';
import { useMomentus } from '@/context/MomentusContext';
import { Category } from '@/types';

interface CategoriesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({ visible, onClose }) => {
  const { categories, upsertCategory, deleteCategory, marketItems, theme } = useMomentus();

  // Edit/Create Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOOGLE_CALENDAR_COLORS[0].color);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [isMetaEnabled, setIsMetaEnabled] = useState(false);
  const [metaHours, setMetaHours] = useState('5');
  const [metaMinutes, setMetaMinutes] = useState('0');

  const ownedStickers = marketItems.filter((m) => m.isOwned && m.type === 'STICKER');

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setSelectedColor(GOOGLE_CALENDAR_COLORS[0].color);
    setSelectedSticker(null);
    setIsMetaEnabled(false);
    setMetaHours('5');
    setMetaMinutes('0');
    setEditModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSelectedColor(cat.color);
    setSelectedSticker(cat.stickerId || null);
    const hasMeta = cat.metaMinutosSemanal != null && cat.metaMinutosSemanal > 0;
    setIsMetaEnabled(hasMeta);
    if (hasMeta && cat.metaMinutosSemanal) {
      setMetaHours(String(Math.floor(cat.metaMinutosSemanal / 60)));
      setMetaMinutes(String(cat.metaMinutosSemanal % 60));
    } else {
      setMetaHours('5');
      setMetaMinutes('0');
    }
    setEditModalVisible(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    let totalMinutes: number | null = null;
    if (isMetaEnabled) {
      const h = parseInt(metaHours, 10) || 0;
      const m = parseInt(metaMinutes, 10) || 0;
      totalMinutes = h * 60 + m;
    }

    upsertCategory(
      editingCategory ? editingCategory.id : null,
      name.trim(),
      selectedColor,
      selectedSticker,
      totalMinutes
    );

    setEditModalVisible(false);
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Excluir Categoria',
      `Tem certeza que deseja excluir "${cat.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteCategory(cat.id),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Gerenciar Categorias</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Cores da Agenda Google e Metas Semanais</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={openCreate} style={[styles.newCategoryBtn, { backgroundColor: theme.primary }]}>
          <Ionicons name="add-circle" size={20} color={getContrastTextColor(theme.primary)} />
          <Text style={[styles.newCategoryBtnText, { color: getContrastTextColor(theme.primary) }]}>
            Nova Categoria
          </Text>
        </TouchableOpacity>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {categories.map((cat) => {
            const meta = cat.metaMinutosSemanal || 0;
            return (
              <View key={cat.id} style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catColorDot, { backgroundColor: cat.color }]}>
                      {cat.stickerId ? (
                        <Ionicons name="sparkles" size={12} color="#FFF" />
                      ) : null}
                    </View>
                    <Text style={[styles.catName, { color: theme.textPrimary }]}>{cat.name}</Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => openEdit(cat)}
                      style={styles.actionIconBtn}>
                      <Ionicons name="pencil" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(cat)}
                      style={styles.actionIconBtn}>
                      <Ionicons name="trash" size={16} color={MomentusColors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {meta > 0 && (
                  <View style={[styles.metaRow, { borderTopColor: theme.outline }]}>
                    <View style={styles.metaLabelRow}>
                      <Text style={[styles.metaTitle, { color: theme.textSecondary }]}>
                        Meta Semanal: {Math.floor(meta / 60)}h {meta % 60}m
                      </Text>
                      <Text style={[styles.metaPercent, { color: theme.primary }]}>50%</Text>
                    </View>
                    <View style={[styles.metaProgressTrack, { backgroundColor: theme.outline }]}>
                      <View style={[styles.metaProgressFill, { backgroundColor: cat.color }]} />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Edit / Create Sub-Modal */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalContent, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <View style={styles.subModalHeader}>
                <Text style={[styles.subModalTitle, { color: theme.textPrimary }]}>
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Nome da Categoria *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
                  placeholder="Ex: Trabalho, Leitura, Corrida..."
                  placeholderTextColor={MomentusColors.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Cor da Agenda Google</Text>
                <View style={styles.colorPaletteGrid}>
                  {GOOGLE_CALENDAR_COLORS.map((c) => {
                    const isSelected = selectedColor === c.color;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedColor(c.color)}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c.color },
                          isSelected && styles.colorCircleSelected,
                        ]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {ownedStickers.length > 0 && (
                  <>
                    <Text style={styles.fieldLabel}>Sticker da Loja (Opcional)</Text>
                    <View style={styles.stickersRow}>
                      <TouchableOpacity
                        onPress={() => setSelectedSticker(null)}
                        style={[
                          styles.stickerChip,
                          selectedSticker === null && styles.stickerChipSelected,
                        ]}>
                        <Text style={styles.stickerText}>Nenhum</Text>
                      </TouchableOpacity>
                      {ownedStickers.map((stk) => {
                        const isSel = selectedSticker === stk.id;
                        return (
                          <TouchableOpacity
                            key={stk.id}
                            onPress={() => setSelectedSticker(stk.id)}
                            style={[
                              styles.stickerChip,
                              isSel && styles.stickerChipSelected,
                            ]}>
                            <Ionicons
                              name={stk.iconName as any}
                              size={16}
                              color={isSel ? MomentusColors.emeraldNeon : MomentusColors.textSecondary}
                            />
                            <Text style={[styles.stickerText, isSel && { color: MomentusColors.emeraldNeon }]}>
                              {stk.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Meta Semanal Switch */}
                <View style={styles.metaSwitchRow}>
                  <View>
                    <Text style={styles.metaSwitchTitle}>Definir Meta Semanal</Text>
                    <Text style={styles.metaSwitchSubtitle}>Acompanhe o tempo investido</Text>
                  </View>
                  <Switch
                    value={isMetaEnabled}
                    onValueChange={setIsMetaEnabled}
                    trackColor={{ false: MomentusColors.navyOutline, true: MomentusColors.emeraldNeon }}
                  />
                </View>

                {isMetaEnabled && (
                  <View style={styles.metaInputsRow}>
                    <View style={styles.metaInputCol}>
                      <Text style={styles.metaInputLabel}>Horas</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={metaHours}
                        onChangeText={setMetaHours}
                      />
                    </View>
                    <View style={styles.metaInputCol}>
                      <Text style={styles.metaInputLabel}>Minutos</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={metaMinutes}
                        onChangeText={setMetaMinutes}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.subModalFooter}>
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  style={styles.cancelSubBtn}>
                  <Text style={styles.cancelSubText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  style={[styles.saveSubBtn, { backgroundColor: theme.primary }, !name.trim() && { opacity: 0.5 }]}
                  disabled={!name.trim()}>
                  <Text style={[styles.saveSubText, { color: getContrastTextColor(theme.primary) }]}>
                    Salvar Categoria
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  newCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MomentusColors.emeraldNeon,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  newCategoryBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  categoryCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catColorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    color: MomentusColors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionIconBtn: {
    padding: 6,
  },
  metaRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: MomentusColors.navyOutline,
    paddingTop: 10,
  },
  metaLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaTitle: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  metaPercent: {
    color: MomentusColors.emeraldNeon,
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaProgressTrack: {
    height: 6,
    backgroundColor: MomentusColors.navyOutline,
    borderRadius: 3,
    overflow: 'hidden',
  },
  metaProgressFill: {
    width: '50%',
    height: '100%',
    borderRadius: 3,
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  subModalContent: {
    backgroundColor: MomentusColors.navyBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 20,
    maxHeight: '90%',
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subModalTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  fieldLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
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
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  stickersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  stickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stickerChipSelected: {
    borderColor: MomentusColors.emeraldNeon,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  stickerText: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
  },
  metaSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  metaSwitchTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  metaSwitchSubtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
  },
  metaInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  metaInputCol: {
    flex: 1,
  },
  metaInputLabel: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  subModalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelSubBtn: {
    flex: 1,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelSubText: {
    color: MomentusColors.textSecondary,
    fontWeight: '600',
  },
  saveSubBtn: {
    flex: 1.5,
    backgroundColor: MomentusColors.emeraldNeon,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveSubText: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
});

