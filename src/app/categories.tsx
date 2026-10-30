import React, { useState, useMemo } from 'react';
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
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMomentus } from '@/context/MomentusContext';
import { Category } from '@/types';
import { GOOGLE_CALENDAR_COLORS } from '@/constants/initialData';
import {
  MomentusColors,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
} from '@/constants/theme';

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { categories, habits, marketItems, upsertCategory, deleteCategory, theme, triggerHaptic } = useMomentus();

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

  // Identifica categoria do sistema / protegida (Outros)
  const isSystemCategory = (cat: Category | null | undefined) => {
    if (!cat) return false;
    const norm = (cat.name || '').trim().toLowerCase();
    const id = (cat.id || '').toLowerCase();
    return (
      id === 'cat-outros' ||
      id === 'outros' ||
      norm === 'outros' ||
      norm === 'outro'
    );
  };

  // Filtra apenas stickers que o usuário realmente possui (isOwned === true)
  const ownedStickers = marketItems.filter(
    (item) => item.isOwned && item.type === 'STICKER'
  );

  // Obtém datas da semana atual (Segunda-feira a Domingo)
  const currentWeekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  }, []);

  // Calcula minutos realizados por categoria na semana atual a partir dos hábitos concluídos
  const categoryWeeklyProgressMap = useMemo(() => {
    const map: Record<string, number> = {};

    habits.forEach((h) => {
      if (h.completed && currentWeekDates.includes(h.date)) {
        let durationMinutes = 30; // Duração padrão se não especificada
        if (h.timeStart && h.timeEnd) {
          const [sH, sM] = h.timeStart.split(':').map((v) => parseInt(v, 10) || 0);
          const [eH, eM] = h.timeEnd.split(':').map((v) => parseInt(v, 10) || 0);
          const diff = (eH * 60 + eM) - (sH * 60 + sM);
          if (diff > 0) {
            durationMinutes = diff;
          }
        }
        map[h.categoryId] = (map[h.categoryId] || 0) + durationMinutes;
      }
    });

    return map;
  }, [habits, currentWeekDates]);

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

    const isSystem = editingCategory ? isSystemCategory(editingCategory) : false;
    const finalName = isSystem ? editingCategory!.name : trimmedName;

    // Valida duplicidade de nome (ignorando maiúsculas/minúsculas)
    const isDuplicate = !isSystem && categories.some(
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
      finalName,
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

  // Quantidade de rotinas afetadas no modal de exclusão
  const deletingCategoryHabitsCount = deletingCategory
    ? habits.filter((h) => h.categoryId === deletingCategory.id).length
    : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
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
              const isSystem = isSystemCategory(cat);
              const linkedHabitsCount = habits.filter((h) => h.categoryId === cat.id).length;

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
                      <View style={styles.categoryTitleCol}>
                        <View style={styles.nameRow}>
                          <Text
                            numberOfLines={1}
                            style={[styles.categoryName, { color: theme.textPrimary }]}>
                            {cat.name}
                          </Text>
                          {isSystem && (
                            <View
                              style={[
                                styles.systemBadge,
                                {
                                  backgroundColor: `${theme.primary}18`,
                                  borderColor: `${theme.primary}40`,
                                },
                              ]}>
                              <Text style={[styles.systemBadgeText, { color: theme.primary }]}>
                                Padrão
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.categoryHabitCount, { color: theme.textSecondary }]}>
                          {linkedHabitsCount === 0
                            ? 'Nenhuma rotina vinculada'
                            : `${linkedHabitsCount} rotina${linkedHabitsCount === 1 ? '' : 's'} vinculada${linkedHabitsCount === 1 ? '' : 's'}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditModal(cat)}
                        style={styles.actionIconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar categoria ${cat.name}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="pencil" size={18} color={theme.primary} />
                      </TouchableOpacity>
                      {!isSystem ? (
                        <TouchableOpacity
                          onPress={() => setDeletingCategory(cat)}
                          style={styles.actionIconBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Excluir categoria ${cat.name}`}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={styles.actionIconDisabled}
                          accessibilityLabel="Categoria padrão do sistema protegida">
                          <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
                        </View>
                      )}
                    </View>
                  </View>

                  {metaMinutos > 0 && (() => {
                    const realizedMinutes = categoryWeeklyProgressMap[cat.id] || 0;
                    const progressRate = Math.min(100, Math.round((realizedMinutes / metaMinutos) * 100));
                    const isGoalReached = realizedMinutes >= metaMinutos;
                    const realizedH = Math.floor(realizedMinutes / 60);
                    const realizedM = realizedMinutes % 60;

                    return (
                      <View style={styles.metaRow}>
                        <View style={styles.metaProgressHeader}>
                          <View style={styles.metaProgressHeaderLeft}>
                            <Ionicons
                              name={isGoalReached ? 'trophy' : 'flag'}
                              size={13}
                              color={isGoalReached ? MomentusColors.gold : (cat.color || theme.primary)}
                            />
                            <Text style={[styles.metaProgressTitle, { color: theme.textPrimary }]}>
                              Meta Semanal
                            </Text>
                            {isGoalReached && (
                              <View
                                style={[
                                  styles.goalReachedBadge,
                                  {
                                    backgroundColor: `${MomentusColors.gold}20`,
                                    borderColor: `${MomentusColors.gold}50`,
                                  },
                                ]}>
                                <Text style={[styles.goalReachedText, { color: MomentusColors.gold }]}>
                                  Atingida! 🏆
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.metaProgressStats, { color: theme.textSecondary }]}>
                            {realizedH > 0 ? `${realizedH}h ` : ''}{realizedM}m / {metaH > 0 ? `${metaH}h ` : ''}{metaM > 0 ? `${metaM}m` : ''} •{' '}
                            <Text
                              style={{
                                fontWeight: '800',
                                color: isGoalReached ? MomentusColors.gold : (cat.color || theme.primary),
                              }}>
                              {progressRate}%
                            </Text>
                          </Text>
                        </View>

                        {/* Barra de Progresso Horizontal Neon */}
                        <View style={[styles.metaProgressBarTrack, { backgroundColor: theme.surfaceElevated }]}>
                          <View
                            style={[
                              styles.metaProgressBarFill,
                              {
                                width: `${progressRate}%`,
                                backgroundColor: isGoalReached ? MomentusColors.gold : (cat.color || theme.primary),
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })()}
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.surface, borderColor: theme.outline },
              ]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsCreateModalOpen(false)}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar formulário"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                      opacity: editingCategory && isSystemCategory(editingCategory) ? 0.7 : 1,
                    },
                  ]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Ex: Trabalho, Estudos, Saúde..."
                  placeholderTextColor={MomentusColors.textMuted}
                  autoFocus={!editingCategory || !isSystemCategory(editingCategory)}
                  editable={!editingCategory || !isSystemCategory(editingCategory)}
                  maxLength={40}
                />
                {editingCategory && isSystemCategory(editingCategory) && (
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, marginBottom: 8 }}>
                    O nome da categoria padrão &#34;Outros&#34; é protegido pelo sistema e não pode ser alterado.
                  </Text>
                )}

                {/* Seção de Meta Semanal Interativa */}
                <View
                  style={[
                    styles.metaCardContainer,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: isMetaEnabled ? `${theme.primary}60` : theme.outline,
                    },
                  ]}>
                  <View style={styles.metaCardHeader}>
                    <View style={styles.metaCardTitleRow}>
                      <Ionicons
                        name="flag"
                        size={17}
                        color={isMetaEnabled ? theme.primary : theme.textSecondary}
                      />
                      <Text style={[styles.metaToggleTitle, { color: theme.textPrimary }]}>
                        Meta Semanal de Tempo
                      </Text>
                    </View>
                    <Switch
                      value={isMetaEnabled}
                      onValueChange={(val) => {
                        triggerHaptic('impact');
                        setIsMetaEnabled(val);
                        if (val && (parseInt(metaHours, 10) || 0) === 0 && (parseInt(metaMinutes, 10) || 0) === 0) {
                          setMetaHours('5');
                          setMetaMinutes('0');
                        }
                      }}
                      trackColor={{ false: theme.outline, true: `${theme.primary}80` }}
                      thumbColor={isMetaEnabled ? theme.primary : theme.isDark ? '#475569' : '#94A3B8'}
                    />
                  </View>

                  <Text style={[styles.metaToggleSub, { color: theme.textSecondary }]}>
                    {isMetaEnabled
                      ? 'Defina o tempo total que você pretende dedicar a esta categoria por semana.'
                      : 'Ative para definir uma meta de tempo de dedicação semanal e acompanhar seu progresso.'}
                  </Text>

                  {isMetaEnabled && (
                    <View style={styles.metaInputsBlock}>
                      {/* Presets Rápidos de Meta Semanal */}
                      <Text style={[styles.metaMiniLabel, { color: theme.textSecondary }]}>
                        Sugestões de Meta Semanal:
                      </Text>
                      <View style={styles.metaPresetsRow}>
                        {[2, 5, 10, 15, 20].map((hoursPreset) => {
                          const isCurrent =
                            parseInt(metaHours, 10) === hoursPreset &&
                            (parseInt(metaMinutes, 10) === 0 || !metaMinutes);
                          return (
                            <TouchableOpacity
                              key={hoursPreset}
                              style={[
                                styles.metaPresetChip,
                                {
                                  backgroundColor: isCurrent ? `${theme.primary}25` : theme.surface,
                                  borderColor: isCurrent ? theme.primary : theme.outline,
                                },
                              ]}
                              onPress={() => {
                                setMetaHours(hoursPreset.toString());
                                setMetaMinutes('0');
                                triggerHaptic('selection');
                              }}
                              activeOpacity={0.75}>
                              <Text
                                style={[
                                  styles.metaPresetChipText,
                                  {
                                    color: isCurrent ? theme.primary : theme.textSecondary,
                                    fontWeight: isCurrent ? '800' : '600',
                                  },
                                ]}>
                                {hoursPreset}h/sem
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Controles de Ajuste Fino de Horas e Minutos */}
                      <View style={styles.metaSteppersRow}>
                        {/* Stepper de Horas */}
                        <View
                          style={[
                            styles.metaStepperBox,
                            { backgroundColor: theme.surface, borderColor: theme.outline },
                          ]}>
                          <Text style={[styles.metaStepperLabel, { color: theme.textSecondary }]}>
                            Horas
                          </Text>
                          <View style={styles.metaStepperControls}>
                            <TouchableOpacity
                              style={[styles.metaStepperBtn, { borderColor: theme.outline }]}
                              onPress={() => {
                                const current = parseInt(metaHours, 10) || 0;
                                setMetaHours(Math.max(0, current - 1).toString());
                                triggerHaptic('impact');
                              }}
                              activeOpacity={0.7}>
                              <Ionicons name="remove" size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.metaStepperValue, { color: theme.textPrimary }]}>
                              {metaHours}h
                            </Text>
                            <TouchableOpacity
                              style={[styles.metaStepperBtn, { borderColor: theme.outline }]}
                              onPress={() => {
                                const current = parseInt(metaHours, 10) || 0;
                                setMetaHours(Math.min(80, current + 1).toString());
                                triggerHaptic('impact');
                              }}
                              activeOpacity={0.7}>
                              <Ionicons name="add" size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Stepper de Minutos */}
                        <View
                          style={[
                            styles.metaStepperBox,
                            { backgroundColor: theme.surface, borderColor: theme.outline },
                          ]}>
                          <Text style={[styles.metaStepperLabel, { color: theme.textSecondary }]}>
                            Minutos
                          </Text>
                          <View style={styles.metaStepperControls}>
                            <TouchableOpacity
                              style={[styles.metaStepperBtn, { borderColor: theme.outline }]}
                              onPress={() => {
                                const current = parseInt(metaMinutes, 10) || 0;
                                const step = [45, 30, 15, 0];
                                const prev = step.find((s) => s < current) ?? 0;
                                setMetaMinutes(String(prev));
                                triggerHaptic('impact');
                              }}
                              activeOpacity={0.7}>
                              <Ionicons name="remove" size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.metaStepperValue, { color: theme.textPrimary }]}>
                              {metaMinutes}m
                            </Text>
                            <TouchableOpacity
                              style={[styles.metaStepperBtn, { borderColor: theme.outline }]}
                              onPress={() => {
                                const current = parseInt(metaMinutes, 10) || 0;
                                const step = [15, 30, 45, 0];
                                const next = step.find((s) => s > current) ?? 0;
                                setMetaMinutes(String(next));
                                triggerHaptic('impact');
                              }}
                              activeOpacity={0.7}>
                              <Ionicons name="add" size={16} color={theme.textPrimary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Resumo da Meta */}
                      <View style={[styles.metaSummaryBadge, { backgroundColor: `${theme.primary}15` }]}>
                        <Ionicons name="checkmark-circle-outline" size={15} color={theme.primary} />
                        <Text style={[styles.metaSummaryText, { color: theme.primary }]}>
                          Meta:{' '}
                          <Text style={{ fontWeight: '800' }}>
                            {parseInt(metaHours, 10) || 0}h {parseInt(metaMinutes, 10) || 0}m por semana
                          </Text>
                          {((parseInt(metaHours, 10) || 0) * 60 + (parseInt(metaMinutes, 10) || 0) > 0)
                            ? ` (${(parseInt(metaHours, 10) || 0) * 60 + (parseInt(metaMinutes, 10) || 0)} min total)`
                            : ''}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Seletor de Cores do Google Agenda */}
                <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 18 }]}>
                  Cor da Categoria
                </Text>
                <View style={styles.colorPaletteGrid}>
                  {GOOGLE_CALENDAR_COLORS.map((item) => {
                    const isSelected = formColor.toUpperCase() === item.color.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setFormColor(item.color)}
                        activeOpacity={0.8}
                        style={[
                          styles.colorPaletteItem,
                          { backgroundColor: item.color },
                          isSelected && [
                            styles.colorPaletteItemSelected,
                            { borderColor: theme.primary },
                          ],
                        ]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
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
                    onPress={() => setIsCreateModalOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar criação ou edição">
                    <Text style={[styles.modalCancelBtnText, { color: theme.textSecondary }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveCategory}
                    accessibilityRole="button"
                    accessibilityLabel="Salvar categoria">
                    <Text style={styles.modalSaveBtnText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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

              {deletingCategoryHabitsCount > 0 && (
                <View
                  style={[
                    styles.deleteWarningBox,
                    {
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      borderColor: 'rgba(245, 158, 11, 0.35)',
                    },
                  ]}>
                  <Ionicons name="alert-circle-outline" size={18} color={MomentusColors.fireStreak} />
                  <Text style={[styles.deleteWarningText, { color: theme.textPrimary }]}>
                    Esta categoria possui{' '}
                    <Text style={{ fontWeight: '800' }}>
                      {deletingCategoryHabitsCount} rotina{deletingCategoryHabitsCount === 1 ? '' : 's'}
                    </Text>
                    . Ao excluir, elas serão transferidas automaticamente para a categoria{' '}
                    <Text style={{ fontWeight: '800' }}>Outros</Text>.
                  </Text>
                </View>
              )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: MomentusColors.navyBackground,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: LayoutTokens.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    paddingBottom: 12,
  },
  backButton: {
    padding: 6,
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  headerTitle: {
    ...TypographyTokens.screenTitle,
  },
  placeholder: {
    width: ComponentHeightTokens.iconButton,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: 8,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  subtitle: {
    ...TypographyTokens.screenSubtitle,
    marginBottom: 20,
  },
  newCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    marginBottom: 24,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitleCol: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryHabitCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  systemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  actionIconDisabled: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.45,
  },
  metaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    gap: 8,
  },
  metaProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaProgressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaProgressTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalReachedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  goalReachedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaProgressStats: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  metaProgressBarFill: {
    height: '100%',
    borderRadius: 3,
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
    maxWidth: LayoutTokens.maxModalSheetWidth,
    maxHeight: '90%',
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  closeBtn: {
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  metaCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
    marginBottom: 4,
    gap: 8,
  },
  metaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  devBadgeText: {
    fontSize: 11,
    fontWeight: '800',
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
  metaToggleTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  metaToggleSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  metaInputsBlock: {
    marginTop: 8,
    gap: 12,
  },
  metaMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  metaPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaPresetChipText: {
    fontSize: 12,
  },
  metaSteppersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaStepperBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  metaStepperLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaStepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaStepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaStepperValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  metaSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 2,
  },
  metaSummaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  colorPaletteItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  colorPaletteItemSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  stickerItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  modalSaveBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteDialogCard: {
    width: '100%',
    maxWidth: LayoutTokens.maxDialogWidth,
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  deleteDialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  deleteDialogDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteWarningText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  modalDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
