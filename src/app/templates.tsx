import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { ApplyTemplateDialog } from '@/components/momentus/ApplyTemplateDialog';
import { RoutineTemplate, TemplateItem } from '@/types';

export default function TemplatesScreen() {
  const { templates, categories, addTemplate, applyTemplateToDates } = useMomentus();

  // Estados de modais
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<RoutineTemplate | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Formulário de Criação de Template
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const newColor = '#34D399';
  const [newItems, setNewItems] = useState<{ title: string; timeStart: string; durationMinutes: number; categoryId: string }[]>([
    { title: 'Primeira atividade', timeStart: '08:00', durationMinutes: 30, categoryId: categories[0]?.id || 'cat-saude' },
  ]);

  // Formulário de Importação
  const [importJsonText, setImportJsonText] = useState('');

  const handleApplyConfirm = (dates: string[], saveToGoogle: boolean) => {
    if (!selectedTemplateForApply) return;

    applyTemplateToDates(selectedTemplateForApply.id, dates, saveToGoogle);

    const templateName = selectedTemplateForApply.title;
    setSelectedTemplateForApply(null);

    Alert.alert(
      'Rotina Agendada! 🚀',
      `"${templateName}" foi aplicada com sucesso em ${dates.length} dia${dates.length === 1 ? '' : 's'}! (+${dates.length * 20} XP)`
    );
  };

  const handleSaveNewTemplate = () => {
    if (!newTitle.trim()) {
      Alert.alert('Atenção', 'Informe o título do template.');
      return;
    }

    const items: TemplateItem[] = newItems.map((item, index) => ({
      id: `ti-${Date.now()}-${index}`,
      title: item.title,
      durationMinutes: item.durationMinutes,
      timeStart: item.timeStart,
      categoryId: item.categoryId,
    }));

    addTemplate({
      title: newTitle.trim(),
      description: newDesc.trim() || 'Template personalizado de rotina',
      icon: 'sparkles',
      color: newColor,
      items,
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewItems([
      { title: 'Primeira atividade', timeStart: '08:00', durationMinutes: 30, categoryId: categories[0]?.id || 'cat-saude' },
    ]);

    Alert.alert('Sucesso!', 'Seu novo template de rotina foi criado.');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.title || !Array.isArray(parsed.items)) {
        throw new Error('Formato inválido. O template precisa ter title e items.');
      }

      addTemplate({
        title: parsed.title,
        description: parsed.description || 'Template importado',
        icon: parsed.icon || 'folder-outline',
        color: parsed.color || '#34D399',
        items: parsed.items.map((it: any, idx: number) => ({
          id: `ti-imp-${Date.now()}-${idx}`,
          title: it.title || 'Atividade',
          durationMinutes: it.durationMinutes || 30,
          timeStart: it.timeStart || '08:00',
          categoryId: it.categoryId || categories[0]?.id || 'cat-saude',
        })),
      });

      setIsImportModalOpen(false);
      setImportJsonText('');
      Alert.alert('Sucesso!', `Template "${parsed.title}" importado com sucesso!`);
    } catch (e: any) {
      Alert.alert('Erro na Importação', e.message || 'JSON inválido');
    }
  };

  const getComplexityLabel = (count: number) => {
    if (count <= 3) return { label: 'Leve', color: MomentusColors.emeraldNeon };
    if (count <= 6) return { label: 'Média', color: MomentusColors.gold };
    return { label: 'Alta', color: MomentusColors.fireStreak };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Modelos de Rotina</Text>
            <Text style={styles.subtitle}>Carregue ou crie blocos reutilizáveis</Text>
          </View>

          <View style={styles.headerButtonsRow}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setIsImportModalOpen(true)}
              activeOpacity={0.7}>
              <Ionicons name="download-outline" size={20} color={MomentusColors.emeraldNeon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerPrimaryBtn}
              onPress={() => setIsCreateModalOpen(true)}
              activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#0F172A" />
              <Text style={styles.headerPrimaryBtnText}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {templates.map((template) => {
            const complexity = getComplexityLabel(template.items.length);
            const totalMinutes = template.items.reduce((acc, i) => acc + (i.durationMinutes || 30), 0);

            return (
              <View key={template.id} style={styles.templateCard}>
                {/* Header do Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconBox, { backgroundColor: `${template.color}20` }]}>
                      <Ionicons name={(template.icon as any) || 'calendar'} size={24} color={template.color} />
                    </View>
                    <View style={styles.titleGroup}>
                      <Text style={styles.cardTitle}>{template.title}</Text>
                      <View style={styles.metaRow}>
                        <View style={[styles.complexityBadge, { backgroundColor: `${complexity.color}15` }]}>
                          <Text style={[styles.complexityBadgeText, { color: complexity.color }]}>
                            {complexity.label}
                          </Text>
                        </View>
                        <Text style={styles.cardMeta}>
                          {template.items.length} atividades • ~{totalMinutes} min
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Descrição */}
                <Text style={styles.cardDesc}>{template.description}</Text>

                {/* Timeline Preview (Primeiras 4 atividades) */}
                <View style={styles.timelinePreviewBox}>
                  <Text style={styles.timelinePreviewTitle}>Linha do tempo:</Text>
                  {template.items.slice(0, 4).map((item, idx) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <View key={idx} style={styles.previewItemRow}>
                        <View style={[styles.previewDot, { backgroundColor: cat?.color || template.color }]} />
                        <Text style={styles.previewTime}>{item.timeStart || '08:00'}</Text>
                        <Text numberOfLines={1} style={styles.previewTitle}>
                          {item.title}
                        </Text>
                      </View>
                    );
                  })}
                  {template.items.length > 4 && (
                    <Text style={styles.previewMoreText}>
                      +{template.items.length - 4} outras atividades...
                    </Text>
                  )}
                </View>

                {/* Botão de Aplicação */}
                <TouchableOpacity
                  onPress={() => setSelectedTemplateForApply(template)}
                  style={styles.applyBtn}
                  activeOpacity={0.85}>
                  <Ionicons name="calendar-outline" size={16} color="#0F172A" />
                  <Text style={styles.applyBtnText}>Agendar em Datas (+20 XP)</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Diálogo de Aplicação de Template (Mini Calendário Multi-Data) */}
        <ApplyTemplateDialog
          visible={!!selectedTemplateForApply}
          templateTitle={selectedTemplateForApply?.title}
          onDismiss={() => setSelectedTemplateForApply(null)}
          onConfirm={handleApplyConfirm}
        />

        {/* Modal: Criar Template */}
        <Modal
          visible={isCreateModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsCreateModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Novo Template</Text>
                  <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                    <Ionicons name="close" size={24} color={MomentusColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Título do Template *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Rotina de Estudos Foco Total"
                  placeholderTextColor={MomentusColors.textMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                <Text style={styles.inputLabel}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Explique o objetivo deste template..."
                  placeholderTextColor={MomentusColors.textMuted}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                  numberOfLines={2}
                />

                <Text style={styles.inputLabel}>Atividades da Rotina ({newItems.length})</Text>
                {newItems.map((item, idx) => (
                  <View key={idx} style={styles.createItemRow}>
                    <TextInput
                      style={[styles.input, { flex: 2 }]}
                      placeholder="Nome da atividade"
                      placeholderTextColor={MomentusColors.textMuted}
                      value={item.title}
                      onChangeText={(val) => {
                        const copy = [...newItems];
                        copy[idx].title = val;
                        setNewItems(copy);
                      }}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="08:00"
                      placeholderTextColor={MomentusColors.textMuted}
                      value={item.timeStart}
                      onChangeText={(val) => {
                        const copy = [...newItems];
                        copy[idx].timeStart = val;
                        setNewItems(copy);
                      }}
                    />
                    {newItems.length > 1 && (
                      <TouchableOpacity
                        onPress={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        style={styles.removeItemBtn}>
                        <Ionicons name="trash-outline" size={18} color={MomentusColors.errorRed} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() =>
                    setNewItems([
                      ...newItems,
                      {
                        title: `Atividade ${newItems.length + 1}`,
                        timeStart: '09:00',
                        durationMinutes: 30,
                        categoryId: categories[0]?.id || 'cat-saude',
                      },
                    ])
                  }>
                  <Ionicons name="add" size={16} color={MomentusColors.emeraldNeon} />
                  <Text style={styles.addItemBtnText}>Adicionar Outra Atividade</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitModalBtn}
                  onPress={handleSaveNewTemplate}
                  activeOpacity={0.85}>
                  <Text style={styles.submitModalBtnText}>Salvar Template</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal: Importar JSON */}
        <Modal
          visible={isImportModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImportModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Importar Template</Text>
                <TouchableOpacity onPress={() => setIsImportModalOpen(false)}>
                  <Ionicons name="close" size={24} color={MomentusColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Cole o código JSON do template para adicioná-lo à sua biblioteca.
              </Text>

              <TextInput
                style={[styles.input, styles.jsonInput]}
                placeholder='{"title": "Rotina", "items": [...]}'
                placeholderTextColor={MomentusColors.textMuted}
                value={importJsonText}
                onChangeText={setImportJsonText}
                multiline
                numberOfLines={6}
              />

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleImportJson}
                disabled={!importJsonText.trim()}
                activeOpacity={0.85}>
                <Text style={styles.submitModalBtnText}>Importar</Text>
              </TouchableOpacity>
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
    backgroundColor: MomentusColors.navyBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  headerPrimaryBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  templateCard: {
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  cardTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  complexityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  complexityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardMeta: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
  },
  cardDesc: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  timelinePreviewBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  timelinePreviewTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: MomentusColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewTime: {
    fontSize: 12,
    fontWeight: '700',
    color: MomentusColors.emeraldNeon,
    width: 44,
  },
  previewTitle: {
    flex: 1,
    fontSize: 13,
    color: MomentusColors.textPrimary,
  },
  previewMoreText: {
    fontSize: 11,
    color: MomentusColors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MomentusColors.emeraldNeon,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  applyBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: MomentusColors.textSecondary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: MomentusColors.navyBackground,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: MomentusColors.textPrimary,
    fontSize: 14,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  jsonInput: {
    height: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  createItemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  removeItemBtn: {
    padding: 8,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    marginTop: 4,
    marginBottom: 16,
  },
  addItemBtnText: {
    color: MomentusColors.emeraldNeon,
    fontSize: 13,
    fontWeight: '700',
  },
  submitModalBtn: {
    backgroundColor: MomentusColors.emeraldNeon,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitModalBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },
});
