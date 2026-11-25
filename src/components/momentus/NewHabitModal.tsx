import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  getContrastTextColor,
  LayoutTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  IconSize,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { getTodayDateString, formatDateToBr } from '@/constants/initialData';
import { HabitItem } from '@/types';
import { TimePickerModal } from './TimePickerModal';
import { parseVoiceHabitCommand } from '@/domain/voiceHabitParser';
import { startVoiceCapture, VoiceCaptureSession } from '@/services/voiceCaptureService';

interface NewHabitModalProps {
  visible: boolean;
  onClose: () => void;
  habitToEdit?: HabitItem | null;
  initialDate?: string;
}

function getRelativeDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const NewHabitModal: React.FC<NewHabitModalProps> = ({
  visible,
  onClose,
  habitToEdit,
  initialDate,
}) => {
  const { categories, addHabit, updateHabit, selectedDate, theme, settings, triggerHaptic } = useMomentus();
  const isEditMode = !!habitToEdit;

  const defaultGoogleSync = settings.googleCalendarSyncEnabled ?? true;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState<string>(initialDate || selectedDate || getTodayDateString());
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('09:00');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saveToGoogle, setSaveToGoogle] = useState(defaultGoogleSync);

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Estados do Quick Voice Capture (Criação por Voz em 1 Toque)
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showSmartCommandFallback, setShowSmartCommandFallback] = useState(false);
  const [smartCommandText, setSmartCommandText] = useState('');
  const voiceSessionRef = useRef<VoiceCaptureSession | null>(null);

  const useNative = Platform.OS !== 'web';
  const [micPulse] = useState(() => new Animated.Value(1));

  const todayIso = useMemo(() => getTodayDateString(), []);
  const tomorrowIso = useMemo(() => getRelativeDateString(1), []);

  // Animação sutil no botão do microfone enquanto escuta
  useEffect(() => {
    if (isListening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, {
            toValue: 1.14,
            duration: 550,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useNative,
          }),
          Animated.timing(micPulse, {
            toValue: 1,
            duration: 550,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useNative,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      micPulse.setValue(1);
    }
  }, [isListening, micPulse, useNative]);

  // Encerra captura de voz ao fechar o modal
  useEffect(() => {
    if (!visible && voiceSessionRef.current) {
      voiceSessionRef.current.abort();
      voiceSessionRef.current = null;
      setIsListening(false);
    }
  }, [visible]);

  useEffect(() => {
    setVoiceTranscript('');
    setVoiceFeedback(null);
    setVoiceError(null);
    setShowSmartCommandFallback(false);
    setSmartCommandText('');

    if (habitToEdit) {
      setTitle(habitToEdit.title);
      setDescription(habitToEdit.description || '');
      setTargetDate(habitToEdit.date || getTodayDateString());
      setTimeStart(habitToEdit.timeStart);
      setTimeEnd(habitToEdit.timeEnd || '09:00');
      setSelectedCategoryId(habitToEdit.categoryId);
      setSaveToGoogle(!!habitToEdit.saveToGoogle);
    } else {
      setTitle('');
      setDescription('');
      setTargetDate(initialDate || selectedDate || getTodayDateString());
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const nextH = String((now.getHours() + 1) % 24).padStart(2, '0');
      setTimeStart(`${h}:00`);
      setTimeEnd(`${nextH}:00`);
      const defaultCat = categories.find((c) => c.name.toLowerCase() === 'outros') || categories[0];
      setSelectedCategoryId(defaultCat?.id || 'cat-outros');
      setSaveToGoogle(settings.googleCalendarSyncEnabled ?? true);
    }
  }, [habitToEdit, visible, categories, settings.googleCalendarSyncEnabled, initialDate, selectedDate]);

  const applyParsedVoicePhrase = (phrase: string) => {
    const parsed = parseVoiceHabitCommand(phrase, categories);
    if (!parsed.title) return;

    setTitle(parsed.title);
    if (parsed.date) setTargetDate(parsed.date);
    if (parsed.timeStart) setTimeStart(parsed.timeStart);
    if (parsed.timeEnd) setTimeEnd(parsed.timeEnd);
    if (parsed.categoryId) setSelectedCategoryId(parsed.categoryId);

    const summaryParts: string[] = [];
    if (parsed.dateLabel) summaryParts.push(parsed.dateLabel);
    if (parsed.timeStart) {
      summaryParts.push(parsed.timeEnd ? `${parsed.timeStart}–${parsed.timeEnd}` : parsed.timeStart);
    }
    if (parsed.categoryName) summaryParts.push(parsed.categoryName);

    setVoiceError(null);
    setVoiceFeedback(
      summaryParts.length > 0
        ? `Preenchido: ${summaryParts.join(' • ')}`
        : `Título capturado: "${parsed.title}"`
    );
    triggerHaptic('success');
  };

  const handleToggleVoiceCapture = async () => {
    if (isListening) {
      triggerHaptic('selection');
      voiceSessionRef.current?.stop();
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    setVoiceFeedback(null);
    setVoiceTranscript('');
    triggerHaptic('light');

    const outcome = await startVoiceCapture(
      {
        onStart: () => {
          setIsListening(true);
        },
        onPartialResult: (partial) => {
          setVoiceTranscript(partial);
        },
        onFinalResult: (finalText) => {
          setVoiceTranscript(finalText);
          applyParsedVoicePhrase(finalText);
        },
        onError: (_code, msg) => {
          setVoiceError(msg);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
          voiceSessionRef.current = null;
        },
      },
      categories.map((c) => c.name)
    );

    if (outcome.started && outcome.session) {
      voiceSessionRef.current = outcome.session;
      setIsListening(true);
      setShowSmartCommandFallback(false);
    } else if (outcome.requiresFallback) {
      // Fallback elegante (ex.: Expo Go ou navegador sem Web Speech API): ditado pelo teclado + NLP
      setShowSmartCommandFallback(true);
      setVoiceError(null);
    } else if (outcome.errorMessage) {
      setVoiceError(outcome.errorMessage);
    }
  };

  const handleApplySmartFallback = () => {
    const trimmed = smartCommandText.trim();
    if (!trimmed) return;
    applyParsedVoicePhrase(trimmed);
    setShowSmartCommandFallback(false);
    setSmartCommandText('');
  };

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

  const isCustomDate = targetDate !== todayIso && targetDate !== tomorrowIso;

  const handleSave = () => {
    if (!isFormValid) return;

    if (voiceSessionRef.current) {
      voiceSessionRef.current.abort();
      voiceSessionRef.current = null;
      setIsListening(false);
    }

    if (isEditMode && habitToEdit) {
      updateHabit({
        ...habitToEdit,
        title: title.trim(),
        description: description.trim() || undefined,
        date: targetDate || habitToEdit.date,
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
        date: targetDate || initialDate || selectedDate || getTodayDateString(),
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

            <View style={styles.headerActions}>
              {/* Ícone discreto de microfone: Quick Voice Capture */}
              <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                <TouchableOpacity
                  onPress={handleToggleVoiceCapture}
                  style={[
                    styles.micBtn,
                    {
                      backgroundColor: isListening
                        ? `${MomentusColors.errorRed}20`
                        : `${theme.primary}15`,
                      borderColor: isListening ? MomentusColors.errorRed : `${theme.primary}45`,
                    },
                  ]}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isListening
                      ? 'Parar captura de voz'
                      : 'Criar rotina por voz (Quick Voice Capture)'
                  }>
                  <Ionicons
                    name={isListening ? 'stop' : 'mic-outline'}
                    size={IconSize.md}
                    color={isListening ? MomentusColors.errorRed : theme.primary}
                  />
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar modal">
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Banner dinâmico enquanto escuta voz */}
            {isListening && (
              <View
                style={[
                  styles.voiceBanner,
                  {
                    backgroundColor: `${theme.primary}14`,
                    borderColor: `${theme.primary}50`,
                  },
                ]}>
                <View style={styles.voiceBannerHeader}>
                  <View style={[styles.voiceLiveDot, { backgroundColor: MomentusColors.errorRed }]} />
                  <Text style={[styles.voiceBannerTitle, { color: theme.primary }]}>
                    Ouvindo... fale sua rotina
                  </Text>
                </View>
                <Text style={[styles.voiceTranscriptText, { color: theme.textPrimary }]}>
                  {voiceTranscript
                    ? `"${voiceTranscript}"`
                    : 'Ex.: "Academia amanhã às 18h categoria Saúde"'}
                </Text>
              </View>
            )}

            {/* Fallback inteligente (Expo Go / navegador sem Speech API): usa ditado do teclado + NLP */}
            {showSmartCommandFallback && !isListening && (
              <View
                style={[
                  styles.voiceBanner,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: `${theme.primary}45`,
                  },
                ]}>
                <Text style={[styles.voiceBannerTitle, { color: theme.primary }]}>
                  Captura Inteligente (use o microfone do teclado ou digite)
                </Text>
                <View style={styles.smartFallbackRow}>
                  <TextInput
                    style={[
                      styles.smartFallbackInput,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.outline,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder="Ex: Academia amanhã às 18h categoria Saúde"
                    placeholderTextColor={MomentusColors.textMuted}
                    value={smartCommandText}
                    onChangeText={setSmartCommandText}
                    onSubmitEditing={handleApplySmartFallback}
                    returnKeyType="done"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleApplySmartFallback}
                    disabled={!smartCommandText.trim()}
                    style={[
                      styles.smartApplyBtn,
                      { backgroundColor: theme.primary },
                      !smartCommandText.trim() && styles.disabledBtn,
                    ]}
                    activeOpacity={0.8}>
                    <Ionicons
                      name="sparkles"
                      size={IconSize.sm}
                      color={getContrastTextColor(theme.primary)}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Feedback sutil após preenchimento automático por voz */}
            {voiceFeedback && !isListening && (
              <View
                style={[
                  styles.voiceFeedbackPill,
                  {
                    backgroundColor: `${theme.primary}15`,
                    borderColor: `${theme.primary}40`,
                  },
                ]}>
                <Ionicons name="checkmark-circle" size={IconSize.sm} color={theme.primary} />
                <Text style={[styles.voiceFeedbackText, { color: theme.textPrimary }]}>
                  {voiceFeedback}
                </Text>
              </View>
            )}

            {voiceError && !isListening && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={IconSize.sm} color={MomentusColors.errorRed} />
                <Text style={styles.errorBannerText}>{voiceError}</Text>
              </View>
            )}

            {/* Title */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Nome da rotina *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline, color: theme.textPrimary }]}
              placeholder="Ex: Estudo de Redes ou toque no microfone"
              placeholderTextColor={MomentusColors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* Data da Rotina (atualizada instantaneamente por voz ou toque rápido) */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Data</Text>
            <View style={styles.dateChipsRow}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setTargetDate(todayIso);
                }}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: targetDate === todayIso ? `${theme.primary}20` : theme.surfaceElevated,
                    borderColor: targetDate === todayIso ? theme.primary : theme.outline,
                  },
                ]}
                activeOpacity={0.75}>
                <Ionicons
                  name="today-outline"
                  size={IconSize.xs}
                  color={targetDate === todayIso ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.dateChipText,
                    { color: targetDate === todayIso ? theme.primary : theme.textSecondary },
                  ]}>
                  Hoje
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('selection');
                  setTargetDate(tomorrowIso);
                }}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: targetDate === tomorrowIso ? `${theme.primary}20` : theme.surfaceElevated,
                    borderColor: targetDate === tomorrowIso ? theme.primary : theme.outline,
                  },
                ]}
                activeOpacity={0.75}>
                <Ionicons
                  name="sunny-outline"
                  size={IconSize.xs}
                  color={targetDate === tomorrowIso ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.dateChipText,
                    { color: targetDate === tomorrowIso ? theme.primary : theme.textSecondary },
                  ]}>
                  Amanhã
                </Text>
              </TouchableOpacity>

              {isCustomDate && (
                <View
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: `${theme.primary}20`,
                      borderColor: theme.primary,
                    },
                  ]}>
                  <Ionicons name="calendar-outline" size={IconSize.xs} color={theme.primary} />
                  <Text style={[styles.dateChipText, { color: theme.primary }]}>
                    {formatDateToBr(targetDate)}
                  </Text>
                </View>
              )}
            </View>

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
              maxLength={250}
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
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar">
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: theme.primary }, !isFormValid && styles.disabledBtn]}
              disabled={!isFormValid}
              accessibilityRole="button"
              accessibilityLabel={isEditMode ? 'Salvar Alterações' : 'Salvar Rotina'}>
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
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  sheetContainer: {
    backgroundColor: MomentusColors.navyBackground,
    borderTopLeftRadius: BorderRadiusTokens.modal,
    borderTopRightRadius: BorderRadiusTokens.modal,
    borderBottomLeftRadius: Platform.OS === 'web' ? BorderRadiusTokens.modal : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? BorderRadiusTokens.modal : 0,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingTop: 20,
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    width: '100%',
    maxWidth: LayoutTokens.maxModalSheetWidth,
    maxHeight: '85%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SpacingTokens.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  micBtn: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    borderRadius: ComponentHeightTokens.buttonCompact / 2,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  title: {
    color: MomentusColors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    marginBottom: SpacingTokens.md,
  },
  voiceBanner: {
    borderWidth: 1,
    borderRadius: BorderRadiusTokens.card,
    padding: SpacingTokens.md,
    gap: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
  },
  voiceBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  voiceLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voiceBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  voiceTranscriptText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  smartFallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  smartFallbackInput: {
    flex: 1,
    height: ComponentHeightTokens.buttonCompact,
    borderWidth: 1,
    borderRadius: BorderRadiusTokens.control,
    paddingHorizontal: SpacingTokens.md,
    fontSize: 13,
  },
  smartApplyBtn: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    borderRadius: BorderRadiusTokens.control,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  voiceFeedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.sm,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    marginBottom: SpacingTokens.sm,
  },
  voiceFeedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  dateChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SpacingTokens.sm,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    height: ComponentHeightTokens.chip,
    paddingHorizontal: SpacingTokens.md,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SpacingTokens.sm,
    marginTop: SpacingTokens.md,
  },
  input: {
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    borderRadius: BorderRadiusTokens.input,
    paddingHorizontal: SpacingTokens.md,
    height: ComponentHeightTokens.input || 48,
    color: MomentusColors.textPrimary,
    fontSize: 15,
  },
  timeInputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadiusTokens.input,
    paddingHorizontal: SpacingTokens.md,
    height: ComponentHeightTokens.input || 48,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: BorderRadiusTokens.control,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.sm,
    marginBottom: SpacingTokens.sm,
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
    marginBottom: SpacingTokens.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.sm,
    borderWidth: 1,
    gap: SpacingTokens.xs,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadiusTokens.card,
    paddingVertical: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.md,
    marginBottom: SpacingTokens.sm,
  },
  timeBlockBtn: {
    flex: 1,
    paddingVertical: SpacingTokens.xs,
  },
  timeBlockTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  timeValueText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeArrowCol: {
    paddingHorizontal: SpacingTokens.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1.5,
    paddingVertical: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.md,
    marginBottom: SpacingTokens.xs,
    gap: SpacingTokens.sm,
  },
  timeRangeSubBtn: {
    flex: 1,
    paddingVertical: SpacingTokens.xs,
  },
  timeRangeSubLabel: {
    fontSize: 11,
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
    paddingHorizontal: SpacingTokens.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: BorderRadiusTokens.sm,
    borderWidth: 1,
  },
  timeRangeDurationText: {
    fontSize: 11,
    fontWeight: '800',
  },
  microErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    marginBottom: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.xs,
  },
  microErrorText: {
    color: MomentusColors.errorRed,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SpacingTokens.sm,
    marginTop: SpacingTokens.xs,
    marginBottom: SpacingTokens.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SpacingTokens.md,
    height: ComponentHeightTokens.chipLarge,
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    gap: SpacingTokens.xs,
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
    marginBottom: SpacingTokens.xs,
  },
  googleSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: BorderRadiusTokens.card,
    padding: SpacingTokens.md,
    marginTop: SpacingTokens.md,
    marginBottom: SpacingTokens.sm,
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
    gap: SpacingTokens.md,
    marginTop: SpacingTokens.sm,
  },
  cancelBtn: {
    flex: 1,
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    alignItems: 'center',
    justifyContent: 'center',
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
