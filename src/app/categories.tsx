import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMomentus } from '@/context/MomentusContext';
import { Category } from '@/types';
import { GOOGLE_CALENDAR_COLORS } from '@/constants/initialData';
import { MomentusColors } from '@/constants/theme';

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { categories, marketItems, upsertCategory, deleteCategory, theme } = useMomentus();

  // Estados dos Diálogos
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Estados do Formulário de Categoria
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(GOOGLE_CALENDAR_COLORS[0].color);
  const [formStickerId, setFormStickerId] = useState<string | null>(null);
  const [isMetaEnabled, setIsMetaEnabled] = useState(false);
  const [metaHours, setMetaHours] = useState('0');
  const [metaMinutes, setMetaMinutes] = useState('0');

  // Filtra apenas stickers que o usuário realmente possui (isOwned === true)
  const ownedStickers = marketItems.filter(
    (item) => item.isOwned && item.type === 'STICKER'
  );

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormColor(GOOGLE_CALENDAR_COLORS[0].color);
    setFormStickerId(null);
    setIsMetaEnabled(false);
    setMetaHours('0');
    setMetaMinutes('0');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormColor(cat.color || GOOGLE_CALENDAR_COLORS[0].color);
    setFormStickerId(cat.stickerId || null);
    if (cat.metaMinutosSemanal && cat.metaMinutosSemanal > 0) {
      setIsMetaEnabled(true);
      setMetaHours(Math.floor(cat.metaMinutosSemanal / 60).toString());
      setMetaMinutes((cat.metaMinutosSemanal % 60).toString());
    } else {
      setIsMetaEnabled(false);
      setMetaHours('0');
      setMetaMinutes('0');
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveCategory = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      Alert.alert('Atenção', 'Por favor, informe o nome da categoria.');
      return;
    }

    // Valida duplicidade de nome (ignorando maiúsculas/minúsculas)
    const isDuplicate = categories.some(
      (c) =>
        c.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        c.id !== editingCategory?.id
    );

    if (isDuplicate) {
      Alert.alert('Erro', `Já existe uma categoria chamada "${trimmedName}".`);
      return;
    }

    let calculatedMeta: number | null = null;
    if (isMetaEnabled) {
      const h = parseInt(metaHours, 10) || 0;
      const m = parseInt(metaMinutes, 10) || 0;
      const totalMin = h * 60 + m;
      if (totalMin > 0) {
        calculatedMeta = totalMin;
      }
    }

    upsertCategory(
      editingCategory ? editingCategory.id : null,
      trimmedName,
      formColor,
      formStickerId,
      calculatedMeta
    );

    setIsCreateModalOpen(false);
    setEditingCategory(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    deleteCategory(deletingCategory.id);
    setDeletingCategory(null);
  };

  const getStickerIconName = (stickerId?: string | null): any => {
    if (!stickerId) return null;
    const sticker = marketItems.find((s) => s.id === stickerId);
    return sticker?.iconName || 'bookmark';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Gerenciar Categorias</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Crie suas categorias do seu jeito
        </Text>

        {/* Botão Nova Categoria */}
        <TouchableOpacity
          style={[styles.newCategoryBtn, { backgroundColor: theme.primary }]}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#0F172A" />
          <Text style={styles.newCategoryBtnText}>Nova Categoria</Text>
        </TouchableOpacity>

        {/* Lista de Categorias */}
        <View style={styles.categoryList}>
          {categories.map((cat) => {
            const stickerIcon = getStickerIconName(cat.stickerId);
            const metaMinutos = cat.metaMinutosSemanal || 0;
            const metaH = Math.floor(metaMinutos / 60);
            const metaM = metaMinutos % 60;

            return (
              <View
                key={cat.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: theme.surface, borderColor: theme.outline },
                ]}>
                <View style={styles.cardMainRow}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: cat.color || '#616161' },
                      ]}>
                      {stickerIcon ? (
                        <Ionicons name={stickerIcon} size={16} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.categoryName, { color: theme.textPrimary }]}>
                      {cat.name}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(cat)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="pencil" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDeletingCategory(cat)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {metaMinutos > 0 && (
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                      Meta Semanal: {metaH}h {metaM}m
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal de Criação / Edição de Categoria */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </Text>
                <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Nome */}
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                Nome da Categoria *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.outline,
                    color: theme.textPrimary,
                  },
                ]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ex: Trabalho, Estudos, Saúde..."
                placeholderTextColor={MomentusColors.textMuted}
                autoFocus
              />

              {/* Seção de Meta Semanal com Switch (Em desenvolvimento) */}
              <View style={[styles.metaToggleRow, { borderColor: theme.outline, opacity: 0.9 }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={[styles.metaToggleTitle, { color: theme.textSecondary }]}>
                      Meta Semanal
                    </Text>
                    <View style={[styles.devBadge, { backgroundColor: `${theme.primary}20`, borderColor: `${theme.primary}40` }]}>
                      <Text style={[styles.devBadgeText, { color: theme.primary }]}>Em desenvolvimento</Text>
                    </View>
                  </View>
                  <Text style={[styles.metaToggleSub, { color: MomentusColors.textMuted }]}>
                    Definição de metas por tempo em breve
                  </Text>
                </View>
                <Switch
                  value={false}
                  disabled={true}
                  trackColor={{ false: theme.outline, true: theme.primary + '60' }}
                  thumbColor={'#64748B'}
                />
              </View>

              {/* Seletor de Cores do Google Agenda */}
              <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 16 }]}>
                Cor da Categoria
              </Text>
              <View style={styles.colorPaletteGrid}>
                {GOOGLE_CALENDAR_COLORS.map((item) => {
                  const isSelected = formColor.toUpperCase() === item.color.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setFormColor(item.color)}
                      style={[
                        styles.colorPaletteItem,
                        { backgroundColor: item.color },
                        isSelected && {
                          borderColor: theme.primary,
                          borderWidth: 3,
                          transform: [{ scale: 1.15 }],
                        },
                      ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Seletor de Stickers Adquiridos */}
              {ownedStickers.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                    Sticker Exclusivo
                  </Text>
                  <View style={styles.stickerRow}>
                    <TouchableOpacity
                      onPress={() => setFormStickerId(null)}
                      style={[
                        styles.stickerItem,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor:
                            formStickerId === null ? theme.primary : theme.outline,
                        },
                      ]}>
                      <Ionicons
                        name="ban"
                        size={18}
                        color={formStickerId === null ? theme.primary : theme.textSecondary}
                      />
                    </TouchableOpacity>

                    {ownedStickers.map((stk) => {
                      const isSelected = formStickerId === stk.id;
                      return (
                        <TouchableOpacity
                          key={stk.id}
                          onPress={() => setFormStickerId(stk.id)}
                          style={[
                            styles.stickerItem,
                            {
                              backgroundColor: theme.surfaceElevated,
                              borderColor: isSelected ? theme.primary : theme.outline,
                            },
                          ]}>
                          <Ionicons
                            name={(stk.iconName as any) || 'sparkles'}
                            size={18}
                            color={isSelected ? theme.primary : theme.textPrimary}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Botões do Modal */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: theme.outline }]}
                  onPress={() => setIsCreateModalOpen(false)}>
                  <Text style={[styles.modalCancelBtnText, { color: theme.textSecondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveCategory}>
                  <Text style={styles.modalSaveBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        visible={!!deletingCategory}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingCategory(null)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.deleteDialogCard,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
            <Text style={[styles.deleteDialogTitle, { color: theme.textPrimary }]}>
              Excluir Categoria
            </Text>
            <Text style={[styles.deleteDialogDesc, { color: theme.textSecondary }]}>
              Tem certeza que deseja excluir a categoria &quot;{deletingCategory?.name}&quot;?
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.outline }]}
                onPress={() => setDeletingCategory(null)}>
                <Text style={[styles.modalCancelBtnText, { color: theme.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmDelete}>
                <Text style={styles.modalDeleteBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  placeholder: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  newCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginBottom: 24,
  },
  newCategoryBtnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 6,
  },
  metaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  devBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  metaToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    marginBottom: 12,
  },
  metaToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaToggleSub: {
    fontSize: 12,
    marginTop: 2,
  },
  metaInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaInputCol: {
    flex: 1,
  },
  metaInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  numberInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    textAlign: 'center',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorPaletteItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  stickerItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteDialogCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  deleteDialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  deleteDialogDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
