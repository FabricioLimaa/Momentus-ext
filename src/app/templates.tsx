import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Share,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { ApplyTemplateDialog } from '@/components/momentus/ApplyTemplateDialog';
import { TimePickerModal } from '@/components/momentus/TimePickerModal';
import { RoutineTemplate, TemplateItem, SharedTemplate } from '@/types';
import {
  COMMUNITY_TRACKS,
  CommunityTemplate,
} from '@/constants/communityTemplates';
import { getTodayDateString } from '@/constants/initialData';

interface EventFormState {
  id?: string;
  title: string;
  description: string;
  timeStart: string;
  timeEnd: string;
  categoryId: string;
}

export default function TemplatesScreen() {
  const router = useRouter();
  const {
    templates,
    categories,
    addHabit,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplateToDates,
    triggerHaptic,
    theme,
  } = useMomentus();

  // Navegação por Abas Principais: Meus Templates vs Galeria da Comunidade
  const [activeTab, setActiveTab] = useState<'my_templates' | 'community'>('my_templates');
  const [communityTagFilter, setCommunityTagFilter] = useState<string>('Todas');
  const [communitySearchQuery, setCommunitySearchQuery] = useState<string>('');
  const [selectedCommunityTemplate, setSelectedCommunityTemplate] = useState<CommunityTemplate | null>(null);

  // Estados dos diálogos
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<RoutineTemplate | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<RoutineTemplate | null>(null);

  // Estados do formulário de criação/edição
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEvents, setFormEvents] = useState<EventFormState[]>([
    {
      title: '',
      description: '',
      timeStart: '08:00',
      timeEnd: '08:30',
      categoryId: categories[0]?.id || 'cat-outros',
    },
  ]);

  // Estado do diálogo de importação
  const [importJsonText, setImportJsonText] = useState('');

  // Estado do TimePicker para itens do template
  const [timePickerTarget, setTimePickerTarget] = useState<{
    index: number;
    field: 'timeStart' | 'timeEnd';
    title: string;
    initialTime: string;
  } | null>(null);

  const defaultCategoryId = categories.find((c) => c.name.toLowerCase() === 'outros')?.id || categories[0]?.id || 'cat-outros';

  const parseTimeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map((v) => parseInt(v, 10) || 0);
    return h * 60 + m;
  };

  const isEventTimeInvalid = (start: string, end: string) => {
    if (!start || !end) return false;
    return parseTimeToMinutes(end) <= parseTimeToMinutes(start);
  };

  const calculateEventDuration = (start: string, end: string) => {
    if (!start || !end) return null;
    const diff = parseTimeToMinutes(end) - parseTimeToMinutes(start);
    if (diff <= 0) return null;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const hasInvalidTime = formEvents.some((ev) => isEventTimeInvalid(ev.timeStart, ev.timeEnd));
  const isFormValid =
    formName.trim().length > 0 &&
    formEvents.every((ev) => ev.title.trim().length > 0 && !isEventTimeInvalid(ev.timeStart, ev.timeEnd));

  const handleOpenCreateModal = () => {
    setEditingTemplateId(null);
    setFormName('');
    setFormDescription('');
    setFormEvents([
      {
        title: '',
        description: '',
        timeStart: '08:00',
        timeEnd: '08:30',
        categoryId: defaultCategoryId,
      },
    ]);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (template: RoutineTemplate) => {
    setEditingTemplateId(template.id);
    setFormName(template.title);
    setFormDescription(template.description || '');
    setFormEvents(
      template.items.length > 0
        ? template.items.map((it) => ({
            id: it.id,
            title: it.title,
            description: it.description || '',
            timeStart: it.timeStart || '08:00',
            timeEnd: it.timeEnd || it.timeStart || '08:30',
            categoryId: it.categoryId || defaultCategoryId,
          }))
        : [
            {
              title: '',
              description: '',
              timeStart: '08:00',
              timeEnd: '08:30',
              categoryId: defaultCategoryId,
            },
          ]
    );
    setIsFormModalOpen(true);
  };

  const handleAddEventField = () => {
    setFormEvents((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        timeStart: '09:00',
        timeEnd: '09:30',
        categoryId: defaultCategoryId,
      },
    ]);
  };

  const handleRemoveEventField = (index: number) => {
    if (formEvents.length <= 1) return;
    setFormEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEventField = (index: number, updates: Partial<EventFormState>) => {
    setFormEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, ...updates } : ev))
    );
  };

  const handleSaveFormTemplate = () => {
    if (!formName.trim()) {
      Alert.alert('Atenção', 'Informe o nome do template.');
      return;
    }

    const hasInvalidEvent = formEvents.some((ev) => !ev.title.trim());
    if (hasInvalidEvent) {
      Alert.alert('Atenção', 'Todos os eventos da rotina precisam ter um título.');
      return;
    }

    if (hasInvalidTime) {
      Alert.alert(
        'Horário Inválido',
        'O horário de término de cada atividade deve ser posterior ao horário de início.'
      );
      return;
    }

    const items: TemplateItem[] = formEvents.map((ev, idx) => ({
      id: ev.id || `ti-${Date.now()}-${idx}`,
      title: ev.title.trim(),
      description: ev.description.trim() || null,
      timeStart: ev.timeStart,
      timeEnd: ev.timeEnd || ev.timeStart,
      categoryId: ev.categoryId,
      order: idx,
    }));

    if (editingTemplateId) {
      const existing = templates.find((t) => t.id === editingTemplateId);
      if (existing) {
        updateTemplate({
          ...existing,
          title: formName.trim(),
          description: formDescription.trim() || null,
          items,
        });
        Alert.alert('Sucesso!', 'Template atualizado com sucesso.');
      }
    } else {
      addTemplate({
        title: formName.trim(),
        description: formDescription.trim() || null,
        icon: 'sparkles',
        color: '#34D399',
        items,
      });
      Alert.alert('Sucesso!', 'Template criado com sucesso.');
    }

    setIsFormModalOpen(false);
  };

  const handleDeleteTemplateConfirm = (template: RoutineTemplate) => {
    setDeletingTemplate(template);
  };

  const handleExecuteDeleteTemplate = () => {
    if (!deletingTemplate) return;
    deleteTemplate(deletingTemplate.id);
    if (editingTemplateId === deletingTemplate.id) {
      setIsFormModalOpen(false);
    }
    setDeletingTemplate(null);
  };

  const handleShareTemplate = async (template: RoutineTemplate) => {
    try {
      const shareData: SharedTemplate = {
        template: {
          id: template.id,
          nome: template.title,
          descricao: template.description || null,
          lastUpdated: template.lastUpdated || new Date().toISOString(),
        },
        eventos: template.items.map((it) => ({
          id: it.id,
          titulo: it.title,
          descricao: it.description || null,
          horarioInicio: it.timeStart,
          horarioTermino: it.timeEnd || it.timeStart,
          horarioInicioString: it.timeStart.length === 5 ? `${it.timeStart}:00` : it.timeStart,
          horarioTerminoString: (it.timeEnd || it.timeStart).length === 5 ? `${it.timeEnd || it.timeStart}:00` : (it.timeEnd || it.timeStart),
          categoryId: it.categoryId,
          templateId: template.id,
          ordem: it.order ?? 0,
        })),
      };

      const jsonString = JSON.stringify(shareData, null, 2);
      await Share.share({
        message: jsonString,
        title: `Template Momentus: ${template.title}`,
      });
    } catch (err: any) {
      console.warn('Erro ao compartilhar template:', err);
    }
  };

  const handleImportJson = () => {
    try {
      if (!importJsonText.trim()) {
        Alert.alert('Atenção', 'Cole o JSON do template para importar.');
        return;
      }

      const parsed = JSON.parse(importJsonText);

      // 1. Formato Kotlin oficial SharedTemplate
      if (parsed.template && Array.isArray(parsed.eventos)) {
        const rawTmpl = parsed.template;
        const rawEvents = parsed.eventos;
        const newTemplateTitle = `${rawTmpl.nome || 'Template'} (Importado)`;
        const newTemplateDesc = rawTmpl.descricao || null;

        const newItems: TemplateItem[] = rawEvents.map((it: any, idx: number) => ({
          id: `ti-imp-${Date.now()}-${idx}`,
          title: it.titulo || it.title || 'Atividade',
          description: it.descricao || it.description || null,
          timeStart: (it.horarioInicioString || it.horarioInicio || '08:00').substring(0, 5),
          timeEnd: (it.horarioTerminoString || it.horarioTermino || '08:30').substring(0, 5),
          categoryId: it.categoryId || defaultCategoryId,
          order: it.ordem ?? idx,
        }));

        addTemplate({
          title: newTemplateTitle,
          description: newTemplateDesc,
          icon: 'sparkles',
          color: '#34D399',
          items: newItems,
        });

        setIsImportModalOpen(false);
        setImportJsonText('');
        Alert.alert('Template Importado! 🚀', `O template "${newTemplateTitle}" foi adicionado.`);
        return;
      }

      // 2. Formato alternativo / legado ({ title, items })
      if (parsed.title && Array.isArray(parsed.items)) {
        const newTemplateTitle = `${parsed.title} (Importado)`;
        const newItems: TemplateItem[] = parsed.items.map((it: any, idx: number) => ({
          id: `ti-imp-${Date.now()}-${idx}`,
          title: it.title || 'Atividade',
          description: it.description || null,
          timeStart: (it.timeStart || '08:00').substring(0, 5),
          timeEnd: (it.timeEnd || '08:30').substring(0, 5),
          categoryId: it.categoryId || defaultCategoryId,
          order: idx,
        }));

        addTemplate({
          title: newTemplateTitle,
          description: parsed.description || null,
          icon: parsed.icon || 'sparkles',
          color: parsed.color || '#34D399',
          items: newItems,
        });

        setIsImportModalOpen(false);
        setImportJsonText('');
        Alert.alert('Template Importado! 🚀', `O template "${newTemplateTitle}" foi adicionado.`);
        return;
      }

      throw new Error('Formato de JSON inválido ou não reconhecido.');
    } catch (e: any) {
      Alert.alert('Erro na Importação', e.message || 'Código JSON inválido');
    }
  };

  const handleApplyConfirm = (
    dates: string[],
    saveToGoogle: boolean,
    mode: 'merge' | 'incremental' = 'merge'
  ) => {
    if (!selectedTemplateForApply) return;

    applyTemplateToDates(selectedTemplateForApply.id, dates, saveToGoogle, mode);

    const templateName = selectedTemplateForApply.title;
    setSelectedTemplateForApply(null);

    const modeText =
      mode === 'incremental'
        ? `adicionada como novas tarefas em ${dates.length} dia${dates.length === 1 ? '' : 's'}`
        : `atualizada e agendada em ${dates.length} dia${dates.length === 1 ? '' : 's'}`;

    Alert.alert(
      'Rotina Aplicada! 📋',
      `"${templateName}" foi ${modeText} com sucesso!`
    );
  };

  const getComplexity = (count: number) => {
    if (count > 8) return 'Alta';
    if (count > 4) return 'Média';
    return 'Leve';
  };

  // Helper de resolução de categoria por tag ou nome
  const resolveCategoryId = (hint?: string) => {
    if (!hint) return defaultCategoryId;
    const match = categories.find((c) => c.name.toLowerCase() === hint.toLowerCase());
    return match?.id || defaultCategoryId;
  };

  // 1-Toque: Adicionar template da comunidade na agenda de hoje
  const handleApplyCommunityToToday = (template: CommunityTemplate) => {
    const today = getTodayDateString();
    template.items.forEach((item) => {
      addHabit({
        title: item.title,
        description: item.description,
        timeStart: item.timeStart,
        timeEnd: item.timeEnd,
        categoryId: resolveCategoryId(item.categoryHint),
        date: today,
        templateSourceId: template.id,
      });
    });
    triggerHaptic('success');
    if (selectedCommunityTemplate) {
      setSelectedCommunityTemplate(null);
    }
    Alert.alert(
      'Rotina Adicionada à Agenda Hoje! 🚀',
      `"${template.title}" foi inserida na sua agenda de hoje com ${template.items.length} blocos de atividades prontos para execução!`,
      [
        { text: 'Ir para a Agenda', onPress: () => router.push('/calendar') },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  // 1-Toque: Salvar template da comunidade no acervo pessoal de templates
  const handleSaveCommunityToMyTemplates = (template: CommunityTemplate) => {
    const newItems: TemplateItem[] = template.items.map((it, idx) => ({
      id: `ti-comm-${Date.now()}-${idx}`,
      title: it.title,
      description: it.description || null,
      timeStart: it.timeStart,
      timeEnd: it.timeEnd,
      categoryId: resolveCategoryId(it.categoryHint),
      order: idx,
    }));

    addTemplate({
      title: template.title,
      description: template.description,
      icon: template.icon,
      color: template.color,
      items: newItems,
    });

    triggerHaptic('success');
    if (selectedCommunityTemplate) {
      setSelectedCommunityTemplate(null);
    }
    setActiveTab('my_templates');
    Alert.alert(
      'Salvo no Seu Acervo! 📂',
      `O template "${template.title}" agora é seu! Você pode personalizá-lo livremente e agendar nas suas semanas.`
    );
  };

  const TAG_OPTIONS = ['Todas', 'Manhã', 'Estudos', 'Saúde', 'Noite', 'Trabalho'];

  const filteredCommunityTracks = COMMUNITY_TRACKS.map((track) => {
    const filteredTemplates = track.templates.filter((tmpl) => {
      const matchesTag =
        communityTagFilter === 'Todas' ||
        tmpl.tags.some((t) => t.toLowerCase() === communityTagFilter.toLowerCase());
      const q = communitySearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tmpl.title.toLowerCase().includes(q) ||
        tmpl.description.toLowerCase().includes(q) ||
        tmpl.tags.some((t) => t.toLowerCase().includes(q)) ||
        tmpl.items.some((it) => it.title.toLowerCase().includes(q));
      return matchesTag && matchesSearch;
    });
    return { ...track, templates: filteredTemplates };
  }).filter((track) => track.templates.length > 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* TopBar */}
        <View style={[styles.topBar, { borderBottomColor: theme.outline }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.topBarTitle, { color: theme.textPrimary }]}>
            {activeTab === 'my_templates' ? 'Meus Templates' : 'Galeria da Comunidade'}
          </Text>

          {activeTab === 'my_templates' ? (
            <TouchableOpacity
              style={styles.importTopBtn}
              onPress={() => setIsImportModalOpen(true)}
              activeOpacity={0.7}>
              <Ionicons name="download-outline" size={18} color={theme.primary} />
              <Text style={[styles.importTopBtnText, { color: theme.primary }]}>Importar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Segmented Control: Meus Templates vs Galeria da Comunidade */}
        <View style={[styles.mainTabsNav, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              activeTab === 'my_templates' && [styles.mainTabBtnActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => {
              setActiveTab('my_templates');
              triggerHaptic('selection');
            }}
            activeOpacity={0.8}>
            <Ionicons
              name="folder-open-outline"
              size={15}
              color={activeTab === 'my_templates' ? '#0F172A' : theme.textSecondary}
            />
            <Text
              style={[
                styles.mainTabBtnText,
                { color: activeTab === 'my_templates' ? '#0F172A' : theme.textSecondary },
                activeTab === 'my_templates' && styles.mainTabBtnTextActive,
              ]}>
              Meus Templates ({templates.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabBtn,
              activeTab === 'community' && [styles.mainTabBtnActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => {
              setActiveTab('community');
              triggerHaptic('selection');
            }}
            activeOpacity={0.8}>
            <Ionicons
              name="sparkles-outline"
              size={15}
              color={activeTab === 'community' ? '#0F172A' : theme.textSecondary}
            />
            <Text
              style={[
                styles.mainTabBtnText,
                { color: activeTab === 'community' ? '#0F172A' : theme.textSecondary },
                activeTab === 'community' && styles.mainTabBtnTextActive,
              ]}>
              Comunidade ✨
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo: Meus Templates vs Galeria da Comunidade */}
        {activeTab === 'my_templates' ? (
          <>
            <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {templates.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: `${theme.textSecondary}15` }]}>
                <Ionicons name="layers-outline" size={48} color={`${theme.textSecondary}80`} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Nenhum template</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Crie seu primeiro template para reutilizar rotinas facilmente.
              </Text>
              <TouchableOpacity
                style={[styles.emptyCreateBtn, { backgroundColor: theme.primary }]}
                onPress={handleOpenCreateModal}
                activeOpacity={0.85}>
                <Ionicons name="add" size={20} color="#0F172A" />
                <Text style={styles.emptyCreateBtnText}>Criar Primeiro Template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            templates.map((template) => {
              const complexity = getComplexity(template.items.length);
              const sortedEvents = [...template.items].sort((a, b) => a.timeStart.localeCompare(b.timeStart));
              const previewEvents = sortedEvents.slice(0, 4);
              const remainingCount = template.items.length - 4;

              const totalDurationMinutes = template.items.reduce((acc, it) => {
                const start = parseTimeToMinutes(it.timeStart);
                const end = parseTimeToMinutes(it.timeEnd || it.timeStart);
                const diff = end - start;
                return acc + (diff > 0 ? diff : 0);
              }, 0);
              const formattedTotalDuration = (() => {
                if (totalDurationMinutes <= 0) return `${template.items.length * 30}m total`;
                const h = Math.floor(totalDurationMinutes / 60);
                const m = totalDurationMinutes % 60;
                if (h > 0 && m > 0) return `${h}h ${m}m total`;
                if (h > 0) return `${h}h total`;
                return `${m}m total`;
              })();

              return (
                <View
                  key={template.id}
                  style={[
                    styles.templateCard,
                    { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}>
                  {/* Cabeçalho do Card */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                        {template.title}
                      </Text>
                      {template.description ? (
                        <Text
                          style={[styles.cardDescription, { color: theme.textSecondary }]}
                          numberOfLines={2}>
                          {template.description}
                        </Text>
                      ) : null}
                      <Text style={[styles.cardItemCount, { color: theme.primary }]}>
                        {template.items.length} atividades configuradas
                      </Text>
                    </View>

                    {/* Botões de Ação */}
                    <View style={styles.cardActionButtons}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleShareTemplate(template)}
                        activeOpacity={0.7}>
                        <Ionicons name="share-social-outline" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleOpenEditModal(template)}
                        activeOpacity={0.7}>
                        <Ionicons name="pencil-outline" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleDeleteTemplateConfirm(template)}
                        activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color={MomentusColors.errorRed} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Chips de Status (Duração real, Complexidade e Eficácia) */}
                  <View style={styles.statChipsRow}>
                    <View style={[styles.statChip, { backgroundColor: `${theme.textSecondary}10`, borderColor: theme.outline }]}>
                      <Ionicons name="time-outline" size={12} color={theme.primary} />
                      <Text style={[styles.statChipText, { color: theme.textPrimary }]}>{formattedTotalDuration}</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: `${theme.textSecondary}10`, borderColor: theme.outline }]}>
                      <Ionicons name="trending-up-outline" size={12} color={theme.primary} />
                      <Text style={[styles.statChipText, { color: theme.textPrimary }]}>Foco {complexity}</Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: `${theme.textSecondary}10`, borderColor: theme.outline }]}>
                      <Ionicons name="star" size={12} color={theme.primary} />
                      <Text style={[styles.statChipText, { color: theme.textPrimary }]}>
                        {template.items.length >= 5 ? 'Alta Eficácia' : 'Eficaz'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.outline }]} />

                  {/* Prévia das Atividades */}
                  <View style={styles.previewEventsList}>
                    {previewEvents.map((item, idx) => {
                      const category = categories.find((c) => c.id === item.categoryId);
                      const catColor = category?.color || '#616161';

                      return (
                        <View key={item.id || idx} style={styles.previewEventRow}>
                          <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                          <View style={styles.previewEventInfo}>
                            <Text style={[styles.previewEventTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            {item.description ? (
                              <Text style={[styles.previewEventDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                                {item.description}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={[styles.previewEventTime, { color: theme.textSecondary }]}>
                            {item.timeStart} - {item.timeEnd || item.timeStart}
                          </Text>
                        </View>
                      );
                    })}

                    {remainingCount > 0 ? (
                      <Text style={[styles.remainingText, { color: theme.primary }]}>
                        + {remainingCount} atividades...
                      </Text>
                    ) : null}
                  </View>

                  {/* Botão Primário: Aplicar Template */}
                  <TouchableOpacity
                    style={[styles.applyButton, { backgroundColor: theme.primary }]}
                    onPress={() => setSelectedTemplateForApply(template)}
                    activeOpacity={0.85}>
                    <Ionicons name="calendar-outline" size={18} color="#0F172A" />
                    <Text style={styles.applyButtonText}>Aplicar Template</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

            {/* FAB (+) para Criar Novo Template */}
            <TouchableOpacity
              style={[styles.fabButton, { backgroundColor: theme.primary }]}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}>
              <Ionicons name="add" size={28} color="#0F172A" />
            </TouchableOpacity>
          </>
        ) : (
          /* Conteúdo: Galeria da Comunidade ("Estilo Streaming / Netflix") */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.communityScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Barra de Busca de Templates */}
            <View style={[styles.searchBoxContainer, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchTextInput, { color: theme.textPrimary }]}
                placeholder="Buscar rotinas (ex: Pomodoro, Manhã, Sono...)"
                placeholderTextColor={theme.textSecondary}
                value={communitySearchQuery}
                onChangeText={setCommunitySearchQuery}
                clearButtonMode="while-editing"
              />
              {communitySearchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setCommunitySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Chips de Tags / Filtros Rápidos */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsFilterRow}>
              {TAG_OPTIONS.map((tag) => {
                const isSelected = communityTagFilter === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      { backgroundColor: theme.surface, borderColor: theme.outline },
                      isSelected && { backgroundColor: `${theme.primary}25`, borderColor: theme.primary },
                    ]}
                    onPress={() => {
                      setCommunityTagFilter(tag);
                      triggerHaptic('impact');
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: theme.textSecondary },
                        isSelected && { color: theme.primary, fontWeight: '800' },
                      ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Trilhas Temáticas de Rotinas */}
            {filteredCommunityTracks.length === 0 ? (
              <View style={styles.emptyCommunityContainer}>
                <Ionicons name="search-outline" size={44} color={`${theme.textSecondary}60`} />
                <Text style={[styles.emptyCommunityTitle, { color: theme.textPrimary }]}>
                  Nenhuma rotina encontrada
                </Text>
                <Text style={[styles.emptyCommunityDesc, { color: theme.textSecondary }]}>
                  Tente alterar os termos de busca ou selecionar outra categoria.
                </Text>
              </View>
            ) : (
              filteredCommunityTracks.map((track) => (
                <View key={track.id} style={styles.trackSection}>
                  {/* Cabeçalho da Trilha */}
                  <View style={styles.trackHeader}>
                    <View style={[styles.trackIconCircle, { backgroundColor: `${track.badgeColor}20` }]}>
                      <Ionicons name={track.icon as any} size={18} color={track.badgeColor} />
                    </View>
                    <View style={styles.trackHeaderInfo}>
                      <Text style={[styles.trackTitle, { color: theme.textPrimary }]}>
                        {track.title}
                      </Text>
                      <Text style={[styles.trackSubtitle, { color: theme.textSecondary }]}>
                        {track.subtitle}
                      </Text>
                    </View>
                  </View>

                  {/* Carrossel Horizontal Estilo Netflix */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContainer}>
                    {track.templates.map((tmpl) => {
                      const totalMinutes = tmpl.items.reduce((acc, it) => acc + (it.durationMinutes || 0), 0);

                      return (
                        <View
                          key={tmpl.id}
                          style={[
                            styles.communityCard,
                            { backgroundColor: theme.surface, borderColor: theme.outline },
                          ]}>
                          <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => {
                              setSelectedCommunityTemplate(tmpl);
                              triggerHaptic('impact');
                            }}>
                            {/* Linha Superior: Badge & Tempo */}
                            <View style={styles.commCardTopRow}>
                              {tmpl.badge ? (
                                <View style={[styles.commBadge, { backgroundColor: `${tmpl.color}20`, borderColor: `${tmpl.color}40` }]}>
                                  <Text style={[styles.commBadgeText, { color: tmpl.color }]}>
                                    {tmpl.badge}
                                  </Text>
                                </View>
                              ) : <View />}

                              <View style={[styles.commTimePill, { backgroundColor: `${theme.textSecondary}15` }]}>
                                <Ionicons name="time-outline" size={11} color={theme.textSecondary} />
                                <Text style={[styles.commTimePillText, { color: theme.textSecondary }]}>
                                  {totalMinutes}m • {tmpl.items.length} hábitos
                                </Text>
                              </View>
                            </View>

                            {/* Ícone e Título */}
                            <View style={styles.commCardMain}>
                              <View style={[styles.commIconBg, { backgroundColor: `${tmpl.color}15` }]}>
                                <Ionicons name={tmpl.icon as any} size={22} color={tmpl.color} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.commCardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                  {tmpl.title}
                                </Text>
                                <Text style={[styles.commCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                  {tmpl.description}
                                </Text>
                              </View>
                            </View>

                            {/* Prévia dos Primeiros Passos */}
                            <View style={styles.commStepsPreview}>
                              {tmpl.items.slice(0, 2).map((it) => (
                                <View key={it.id} style={styles.commStepRow}>
                                  <View style={[styles.commStepDot, { backgroundColor: tmpl.color }]} />
                                  <Text style={[styles.commStepText, { color: theme.textSecondary }]} numberOfLines={1}>
                                    <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{it.timeStart}</Text> {it.title}
                                  </Text>
                                </View>
                              ))}
                              {tmpl.items.length > 2 && (
                                <Text style={[styles.commMoreStepsText, { color: tmpl.color }]}>
                                  + {tmpl.items.length - 2} etapas na rotina...
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>

                          {/* Botões de Ação de 1-Toque */}
                          <View style={styles.commActionsRow}>
                            <TouchableOpacity
                              style={[styles.commTodayBtn, { backgroundColor: theme.primary }]}
                              onPress={() => handleApplyCommunityToToday(tmpl)}
                              activeOpacity={0.85}>
                              <Ionicons name="flash" size={14} color="#0F172A" />
                              <Text style={styles.commTodayBtnText}>+ Hoje</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.commSaveBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                              onPress={() => handleSaveCommunityToMyTemplates(tmpl)}
                              activeOpacity={0.8}>
                              <Ionicons name="bookmark-outline" size={14} color={theme.textPrimary} />
                              <Text style={[styles.commSaveBtnText, { color: theme.textPrimary }]}>Salvar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Modal de Criação / Edição de Template (CreateTemplateDialog.kt) */}
      <Modal
        visible={isFormModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsFormModalOpen(false)}>
        <SafeAreaView style={[styles.formModalSafe, { backgroundColor: theme.background }]}>
          <StatusBar
            barStyle={theme.isDark ? 'light-content' : 'dark-content'}
            backgroundColor={theme.background}
          />
          <View style={[styles.formModalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.formModalHeader, { borderBottomColor: theme.outline }]}>
              <View>
                <Text style={[styles.formModalTitle, { color: theme.textPrimary }]}>
                  {editingTemplateId ? 'Editar Template' : 'Criar Template'}
                </Text>
                <Text style={[styles.formModalSubtitle, { color: theme.textSecondary }]}>
                  Defina uma rotina com múltiplos eventos
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: `${theme.textSecondary}15` }]}
                onPress={() => setIsFormModalOpen(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Fechar formulário">
                <Ionicons name="close" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}>
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {/* Nome do Template */}
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>Nome do Template *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.outline, color: theme.textPrimary }]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="ex: Dia de Trabalho, Fim de Semana"
                  placeholderTextColor={`${theme.textSecondary}80`}
                  maxLength={60}
                />

                {/* Descrição do Template */}
                <Text style={[styles.inputLabel, { color: theme.textPrimary, marginTop: 16 }]}>
                  Descrição do Template (opcional)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.outline, color: theme.textPrimary }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Ex: Rotina focada em estudos e foco..."
                  placeholderTextColor={`${theme.textSecondary}80`}
                  maxLength={200}
                />

                {/* Eventos da Rotina */}
                <View style={styles.eventsHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.primary }]}>Eventos da Rotina</Text>
                  <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                    {formEvents.length} evento{formEvents.length === 1 ? '' : 's'}
                  </Text>
                </View>

                {formEvents.map((ev, index) => (
                  <View
                    key={index}
                    style={[
                      styles.eventFormCard,
                      { backgroundColor: theme.surface, borderColor: theme.outline },
                    ]}>
                    <View style={styles.eventFormCardHeader}>
                      <Text style={[styles.eventFormIndex, { color: theme.primary }]}>
                        Evento {index + 1}
                      </Text>
                      {formEvents.length > 1 ? (
                        <TouchableOpacity
                          onPress={() => handleRemoveEventField(index)}
                          style={styles.removeEventBtn}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Remover evento ${index + 1}`}>
                          <Ionicons name="trash-outline" size={18} color={MomentusColors.errorRed} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Título do Evento */}
                    <TextInput
                      style={[styles.eventInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
                      value={ev.title}
                      onChangeText={(val) => handleUpdateEventField(index, { title: val })}
                      placeholder="Título da atividade *"
                      placeholderTextColor={`${theme.textSecondary}80`}
                      maxLength={80}
                    />

                    {/* Descrição do Evento */}
                    <TextInput
                      style={[styles.eventInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary, marginTop: 8 }]}
                      value={ev.description}
                      onChangeText={(val) => handleUpdateEventField(index, { description: val })}
                      placeholder="Descrição da atividade (opcional)"
                      placeholderTextColor={`${theme.textSecondary}80`}
                      maxLength={200}
                    />

                    {/* Faixa Integrada de Horário (Time Range Chip) */}
                    {(() => {
                      const isTimeInvalid = isEventTimeInvalid(ev.timeStart, ev.timeEnd);
                      const duration = calculateEventDuration(ev.timeStart, ev.timeEnd);
                      return (
                        <View style={styles.eventTimeRangeWrapper}>
                          <View
                            style={[
                              styles.eventTimeRangeChip,
                              {
                                backgroundColor: theme.surfaceElevated,
                                borderColor: isTimeInvalid ? MomentusColors.errorRed : theme.outline,
                              },
                            ]}>
                            {/* Início */}
                            <TouchableOpacity
                              style={styles.eventTimeRangeSubBtn}
                              onPress={() =>
                                setTimePickerTarget({
                                  index,
                                  field: 'timeStart',
                                  title: `Hora de Início - Atividade ${index + 1}`,
                                  initialTime: ev.timeStart,
                                })
                              }
                              activeOpacity={0.7}>
                              <Text style={[styles.eventTimeRangeSubLabel, { color: theme.textSecondary }]}>Início</Text>
                              <View style={styles.timeValueRow}>
                                <Text style={[styles.eventTimeRangeValText, { color: theme.textPrimary }]}>
                                  {ev.timeStart}
                                </Text>
                                <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                              </View>
                            </TouchableOpacity>

                            {/* Seta Divisora */}
                            <View style={styles.eventTimeRangeArrowBox}>
                              <Ionicons
                                name="arrow-forward"
                                size={14}
                                color={isTimeInvalid ? MomentusColors.errorRed : theme.primary}
                              />
                            </View>

                            {/* Término */}
                            <TouchableOpacity
                              style={styles.eventTimeRangeSubBtn}
                              onPress={() =>
                                setTimePickerTarget({
                                  index,
                                  field: 'timeEnd',
                                  title: `Hora de Término - Atividade ${index + 1}`,
                                  initialTime: ev.timeEnd,
                                })
                              }
                              activeOpacity={0.7}>
                              <Text style={[styles.eventTimeRangeSubLabel, { color: theme.textSecondary }]}>Término</Text>
                              <View style={styles.timeValueRow}>
                                <Text style={[styles.eventTimeRangeValText, { color: theme.textPrimary }]}>
                                  {ev.timeEnd}
                                </Text>
                                <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                              </View>
                            </TouchableOpacity>

                            {/* Tag de Duração Calculada */}
                            <View
                              style={[
                                styles.eventDurationTag,
                                {
                                  backgroundColor: isTimeInvalid ? `${MomentusColors.errorRed}15` : `${theme.primary}18`,
                                  borderColor: isTimeInvalid ? `${MomentusColors.errorRed}40` : `${theme.primary}30`,
                                },
                              ]}>
                              <Ionicons
                                name={isTimeInvalid ? 'alert-circle' : 'hourglass-outline'}
                                size={11}
                                color={isTimeInvalid ? MomentusColors.errorRed : theme.primary}
                              />
                              <Text
                                style={[
                                  styles.eventDurationTagText,
                                  { color: isTimeInvalid ? MomentusColors.errorRed : theme.primary },
                                ]}>
                                {isTimeInvalid ? 'Inválido' : duration || '30m'}
                              </Text>
                            </View>
                          </View>

                          {/* Microvalidação sutil */}
                          {isTimeInvalid && (
                            <View style={styles.microErrorRow}>
                              <Ionicons name="alert-circle" size={12} color={MomentusColors.errorRed} />
                              <Text style={styles.microErrorText}>
                                O horário de término deve ser posterior ao início
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}

                    {/* Categoria */}
                    <Text style={[styles.timeLabel, { color: theme.textSecondary, marginTop: 10, marginBottom: 6 }]}>
                      Categoria
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {categories.map((cat) => {
                        const isSelected = ev.categoryId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.categoryChip,
                              {
                                backgroundColor: isSelected ? `${cat.color}30` : theme.surfaceElevated,
                                borderColor: isSelected ? cat.color : theme.outline,
                              },
                            ]}
                            onPress={() => handleUpdateEventField(index, { categoryId: cat.id })}
                            activeOpacity={0.7}>
                            <View style={[styles.chipDot, { backgroundColor: cat.color }]} />
                            <Text style={[styles.chipText, { color: isSelected ? cat.color : theme.textPrimary }]}>
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))}

                {/* Botão Adicionar Evento */}
                <TouchableOpacity
                  style={[styles.addEventBtn, { borderColor: theme.primary }]}
                  onPress={handleAddEventField}
                  activeOpacity={0.7}>
                  <Ionicons name="add" size={18} color={theme.primary} />
                  <Text style={[styles.addEventBtnText, { color: theme.primary }]}>Adicionar Evento</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer com Botão de Confirmação */}
            <View style={[styles.formModalFooter, { borderTopColor: theme.outline }]}>
              <TouchableOpacity
                style={[
                  styles.saveTemplateBtn,
                  { backgroundColor: theme.primary },
                  !isFormValid && styles.disabledBtn,
                ]}
                onPress={handleSaveFormTemplate}
                disabled={!isFormValid}
                activeOpacity={0.85}>
                <Ionicons name="checkmark" size={20} color="#0F172A" />
                <Text style={styles.saveTemplateBtnText}>
                  {editingTemplateId ? 'Salvar Alterações' : 'Criar Template'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Importação (ImportTemplateDialog.kt) */}
      <Modal
        visible={isImportModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsImportModalOpen(false)}>
        <View style={styles.importOverlay}>
          <View style={[styles.importDialog, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <Text style={[styles.importTitle, { color: theme.textPrimary }]}>Importar Template</Text>
            <Text style={[styles.importSubtitle, { color: theme.textSecondary }]}>
              Cole o código do template compartilhado abaixo para adicioná-lo à sua lista.
            </Text>

            <TextInput
              style={[styles.importInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
              value={importJsonText}
              onChangeText={setImportJsonText}
              placeholder="Cole o JSON do template aqui..."
              placeholderTextColor={`${theme.textSecondary}80`}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.importActions}>
              <TouchableOpacity
                style={styles.importCancelBtn}
                onPress={() => setIsImportModalOpen(false)}
                activeOpacity={0.7}>
                <Text style={[styles.importCancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleImportJson}
                activeOpacity={0.85}>
                <Text style={styles.importConfirmBtnText}>Importar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Aplicação de Template */}
      {selectedTemplateForApply && (
        <ApplyTemplateDialog
          visible={true}
          templateId={selectedTemplateForApply.id}
          templateTitle={selectedTemplateForApply.title}
          onDismiss={() => setSelectedTemplateForApply(null)}
          onConfirm={handleApplyConfirm}
        />
      )}

      {/* Modal de Seleção de Horário para Atividades do Template */}
      {timePickerTarget && (
        <TimePickerModal
          visible={true}
          title={timePickerTarget.title}
          initialTime={timePickerTarget.initialTime}
          onDismiss={() => setTimePickerTarget(null)}
          onConfirm={(newTime) => {
            handleUpdateEventField(timePickerTarget.index, {
              [timePickerTarget.field]: newTime,
            });
            setTimePickerTarget(null);
          }}
        />
      )}

      {/* Modal Dedicado de Exclusão de Template */}
      <Modal
        visible={!!deletingTemplate}
        transparent
        animationType="fade"
        onRequestClose={() => setDeletingTemplate(null)}>
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteDialogCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={28} color={MomentusColors.errorRed} />
            </View>
            <Text style={[styles.deleteDialogTitle, { color: theme.textPrimary }]}>Excluir Template</Text>
            <Text style={[styles.deleteDialogDesc, { color: theme.textSecondary }]}>
              Tem certeza que deseja excluir o template &quot;{deletingTemplate?.title}&quot;? Esta rotina de {deletingTemplate?.items.length} atividades será permanentemente removida.
            </Text>
            <View style={styles.deleteButtonsRow}>
              <TouchableOpacity
                style={[styles.deleteCancelBtn, { borderColor: theme.outline, backgroundColor: theme.surfaceElevated }]}
                onPress={() => setDeletingTemplate(null)}
                activeOpacity={0.7}>
                <Text style={[styles.deleteCancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: MomentusColors.errorRed }]}
                onPress={handleExecuteDeleteTemplate}
                activeOpacity={0.85}>
                <Text style={styles.deleteConfirmBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalhado de Prévia da Rotina da Comunidade */}
      <Modal
        visible={!!selectedCommunityTemplate}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCommunityTemplate(null)}>
        <View style={styles.commModalOverlay}>
          <View style={[styles.commModalCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
            {/* Cabeçalho */}
            <View style={styles.commModalHeader}>
              <View style={styles.commModalHeaderLeft}>
                <View
                  style={[
                    styles.commModalIconBg,
                    { backgroundColor: `${selectedCommunityTemplate?.color || theme.primary}20` },
                  ]}>
                  <Ionicons
                    name={(selectedCommunityTemplate?.icon as any) || 'sparkles'}
                    size={24}
                    color={selectedCommunityTemplate?.color || theme.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.commModalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {selectedCommunityTemplate?.title}
                  </Text>
                  <Text style={[styles.commModalTrack, { color: theme.primary }]}>
                    {selectedCommunityTemplate?.trackTitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.commModalCloseBtn, { backgroundColor: theme.surfaceElevated }]}
                onPress={() => setSelectedCommunityTemplate(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Descrição e Tags */}
            <Text style={[styles.commModalDesc, { color: theme.textSecondary }]}>
              {selectedCommunityTemplate?.description}
            </Text>

            <View style={styles.commModalTagsRow}>
              {selectedCommunityTemplate?.tags.map((tg) => (
                <View key={tg} style={[styles.commModalTag, { backgroundColor: `${theme.primary}15` }]}>
                  <Text style={[styles.commModalTagText, { color: theme.primary }]}>#{tg}</Text>
                </View>
              ))}
            </View>

            {/* Lista Rolável de Etapas */}
            <Text style={[styles.commModalSectionTitle, { color: theme.textPrimary }]}>
              Etapas da Rotina ({selectedCommunityTemplate?.items.length || 0})
            </Text>

            <ScrollView
              style={styles.commModalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {selectedCommunityTemplate?.items.map((step, idx) => (
                <View
                  key={step.id || idx}
                  style={[styles.commModalStepCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
                  <View style={[styles.commModalStepDot, { backgroundColor: selectedCommunityTemplate.color }]} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.commModalStepTop}>
                      <Text style={[styles.commModalStepTitle, { color: theme.textPrimary }]}>
                        {step.title}
                      </Text>
                      <Text style={[styles.commModalStepTime, { color: theme.textSecondary }]}>
                        {step.timeStart} - {step.timeEnd} ({step.durationMinutes}m)
                      </Text>
                    </View>
                    {step.description ? (
                      <Text style={[styles.commModalStepDesc, { color: theme.textSecondary }]}>
                        {step.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Botões de Ação de 1-Toque */}
            <View style={styles.commModalFooter}>
              <TouchableOpacity
                style={[styles.commModalTodayBtn, { backgroundColor: theme.primary }]}
                onPress={() => selectedCommunityTemplate && handleApplyCommunityToToday(selectedCommunityTemplate)}
                activeOpacity={0.85}>
                <Ionicons name="flash" size={18} color="#0F172A" />
                <Text style={styles.commModalTodayBtnText}>+ Adicionar à Agenda Hoje</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.commModalSaveBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
                onPress={() => selectedCommunityTemplate && handleSaveCommunityToMyTemplates(selectedCommunityTemplate)}
                activeOpacity={0.8}>
                <Ionicons name="bookmark-outline" size={18} color={theme.textPrimary} />
                <Text style={[styles.commModalSaveBtnText, { color: theme.textPrimary }]}>
                  Salvar no Meu Acervo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingVertical: LayoutTokens.pagePaddingTop,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  topBarTitle: {
    ...TypographyTokens.screenTitle,
    flex: 1,
    marginLeft: 8,
  },
  importTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadiusTokens.control,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  importTopBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: 16,
    paddingBottom: LayoutTokens.pagePaddingBottom,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  emptyCreateBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },
  templateCard: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardItemCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  statChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  previewEventsList: {
    gap: 10,
    marginBottom: 16,
  },
  previewEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  previewEventInfo: {
    flex: 1,
    marginRight: 12,
  },
  previewEventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewEventDesc: {
    fontSize: 12,
  },
  previewEventTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '700',
    paddingLeft: 20,
    marginTop: 2,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  applyButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 15,
  },
  fabButton: {
    position: 'absolute',
    right: LayoutTokens.pagePaddingHorizontal,
    bottom: 24,
    width: ComponentHeightTokens.fab,
    height: ComponentHeightTokens.fab,
    borderRadius: ComponentHeightTokens.fab / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  formModalSafe: {
    flex: 1,
    width: '100%',
    backgroundColor: MomentusColors.navyBackground,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any, width: '100vw' as any } : {}),
  },
  formModalContainer: {
    flex: 1,
    width: '100%',
    maxWidth: LayoutTokens.maxModalSheetWidth,
    alignSelf: 'center',
  },
  formModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  formModalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  eventsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  eventFormCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  eventFormCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventFormIndex: {
    fontSize: 13,
    fontWeight: '800',
  },
  removeEventBtn: {
    padding: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  eventInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  eventTimeRangeWrapper: {
    marginTop: 10,
  },
  eventTimeRangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  eventTimeRangeSubBtn: {
    flex: 1,
    paddingVertical: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  eventTimeRangeSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTimeRangeValText: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eventTimeRangeArrowBox: {
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDurationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  eventDurationTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  microErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  microErrorText: {
    color: MomentusColors.errorRed,
    fontSize: 11,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  addEventBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  formModalFooter: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  saveTemplateBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },
  importOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  importDialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  importTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  importSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  importInput: {
    height: 140,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    marginBottom: 20,
  },
  importActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  importCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  importCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  importConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  importConfirmBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteDialogCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${MomentusColors.errorRed}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteDialogTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteDialogDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  deleteButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  deleteCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  /* Abas Principais: Meus Templates vs Galeria da Comunidade */
  mainTabsNav: {
    flexDirection: 'row',
    marginHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 7,
  },
  mainTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  mainTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainTabBtnTextActive: {
    fontWeight: '800',
  },
  /* Galeria da Comunidade */
  communityScrollContent: {
    paddingBottom: 40,
  },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  tagsFilterRow: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCommunityContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCommunityTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCommunityDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  trackSection: {
    marginBottom: 24,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    marginBottom: 12,
    gap: 10,
  },
  trackIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackHeaderInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  trackSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  carouselContainer: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    gap: 14,
  },
  communityCard: {
    width: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  commCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  commBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  commTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  commTimePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  commCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  commIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  commCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  commStepsPreview: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  commStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  commStepText: {
    fontSize: 11,
    flex: 1,
  },
  commMoreStepsText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  commActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commTodayBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  commTodayBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
  },
  commSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  commSaveBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  /* Modal de Detalhes da Rotina */
  commModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  commModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
  },
  commModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  commModalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  commModalIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commModalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  commModalTrack: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  commModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commModalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  commModalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  commModalTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  commModalTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commModalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  commModalScroll: {
    maxHeight: 280,
    marginBottom: 14,
  },
  commModalStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  commModalStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  commModalStepTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commModalStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  commModalStepTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  commModalStepDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  commModalFooter: {
    gap: 8,
  },
  commModalTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  commModalTodayBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  commModalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  commModalSaveBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
