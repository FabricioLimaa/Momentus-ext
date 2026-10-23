import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors, getContrastTextColor } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { formatDateToBr } from '@/constants/initialData';

interface ApplyTemplateDialogProps {
  visible: boolean;
  templateId?: string;
  templateTitle?: string;
  onDismiss: () => void;
  onConfirm: (
    selectedDates: string[],
    saveToGoogle: boolean,
    mode: 'merge' | 'incremental'
  ) => void;
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const ApplyTemplateDialog: React.FC<ApplyTemplateDialogProps> = ({
  visible,
  templateId,
  templateTitle,
  onDismiss,
  onConfirm,
}) => {
  const { theme, habits } = useMomentus();
  const [step, setStep] = useState<'CALENDAR' | 'DECISION'>('CALENDAR');
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return [`${y}-${m}-${d}`];
  });

  const [saveToGoogle, setSaveToGoogle] = useState(false);

  const prevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  // Identifica datas conflitantes (que já possuem hábitos deste template)
  const conflictingDates = selectedDates.filter((d) =>
    habits.some(
      (h) =>
        h.date === d &&
        ((templateId && h.templateSourceId === templateId) ||
          (templateId && h.id.startsWith(`applied_`)))
    )
  );

  const handleInitialConfirm = () => {
    if (selectedDates.length === 0) return;

    if (conflictingDates.length > 0) {
      setStep('DECISION');
    } else {
      onConfirm(selectedDates, saveToGoogle, 'merge');
    }
  };

  // Montar os dias do mês
  const { year, month } = currentYearMonth;
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: d, dateStr });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 'DECISION' ? (
              <View style={styles.decisionContent}>
                {/* Cabeçalho de Decisão */}
                <View style={styles.decisionHeaderRow}>
                  <View style={[styles.decisionIconBg, { backgroundColor: `${theme.primary}20` }]}>
                    <Ionicons name="repeat" size={24} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.decisionTitle, { color: theme.textPrimary }]}>
                      Rotina Já Agendada
                    </Text>
                    <Text style={[styles.decisionSubtitle, { color: theme.textSecondary }]}>
                      {conflictingDates.length} das {selectedDates.length} data(s) selecionada(s) já possuem hábitos desta rotina.
                    </Text>
                  </View>
                </View>

                {/* Chips com as datas conflitantes */}
                <View style={styles.conflictDatesRow}>
                  {conflictingDates.map((dateStr) => (
                    <View
                      key={dateStr}
                      style={[
                        styles.conflictDateBadge,
                        { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` },
                      ]}>
                      <Ionicons name="calendar-outline" size={12} color={theme.primary} />
                      <Text style={[styles.conflictDateBadgeText, { color: theme.primary }]}>
                        {formatDateToBr(dateStr)}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.decisionPromptText, { color: theme.textPrimary }]}>
                  Como deseja aplicar as rotinas nesta(s) data(s)?
                </Text>

                {/* Opção 1: Atualizar Existentes */}
                <TouchableOpacity
                  style={[
                    styles.decisionCardOption,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => onConfirm(selectedDates, saveToGoogle, 'merge')}
                  activeOpacity={0.8}>
                  <View style={styles.decisionCardHeader}>
                    <View style={styles.decisionCardTitleRow}>
                      <Ionicons name="sync" size={18} color={theme.primary} />
                      <Text style={[styles.decisionCardTitle, { color: theme.textPrimary }]}>
                        Atualizar Existentes
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.recommendedPill,
                        { backgroundColor: `${theme.primary}25` },
                      ]}>
                      <Text style={[styles.recommendedPillText, { color: theme.primary }]}>
                        RECOMENDADO
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.decisionCardDesc, { color: theme.textSecondary }]}>
                    Atualiza títulos, horários e categorias preservando o histórico de conclusão se você já cumpriu a rotina.
                  </Text>
                </TouchableOpacity>

                {/* Opção 2: Adicionar como Novos (Incremental) */}
                <TouchableOpacity
                  style={[
                    styles.decisionCardOption,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.outline,
                    },
                  ]}
                  onPress={() => onConfirm(selectedDates, saveToGoogle, 'incremental')}
                  activeOpacity={0.8}>
                  <View style={styles.decisionCardHeader}>
                    <View style={styles.decisionCardTitleRow}>
                      <Ionicons name="add-circle-outline" size={18} color={MomentusColors.gold} />
                      <Text style={[styles.decisionCardTitle, { color: theme.textPrimary }]}>
                        Adicionar como Novos
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.recommendedPill,
                        { backgroundColor: `${MomentusColors.gold}20` },
                      ]}>
                      <Text style={[styles.recommendedPillText, { color: MomentusColors.gold }]}>
                        INCREMENTAL
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.decisionCardDesc, { color: theme.textSecondary }]}>
                    Soma os hábitos do template como novas tarefas ao dia, sem alterar nem remover as rotinas anteriores.
                  </Text>
                </TouchableOpacity>

                {/* Botões de Ação */}
                <View style={[styles.buttonsRow, { marginTop: 12 }]}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setStep('CALENDAR')}
                    activeOpacity={0.7}>
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                      Voltar ao Calendário
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onDismiss}
                    activeOpacity={0.7}>
                    <Text style={[styles.cancelButtonText, { color: MomentusColors.dangerRed }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>Aplicar Template</Text>
                <Text style={[styles.dialogSubtitle, { color: theme.textSecondary }]}>
                  {templateTitle
                    ? `Agendar "${templateTitle}" nas datas selecionadas.`
                    : 'Escolha os dias para agendar esta rotina.'}
                </Text>

                {/* Cabeçalho do Calendário */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    onPress={prevMonth}
                    style={[styles.navButton, { backgroundColor: theme.surfaceElevated }]}
                    activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <Text style={[styles.monthTitle, { color: theme.textPrimary }]}>
                    {MONTH_NAMES[month]} {year}
                  </Text>

                  <TouchableOpacity
                    onPress={nextMonth}
                    style={[styles.navButton, { backgroundColor: theme.surfaceElevated }]}
                    activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Dias da semana */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((w, idx) => (
                    <Text key={idx} style={[styles.weekdayText, { color: theme.primary }]}>
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Grid do Calendário */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((item, index) => {
                    if (!item) {
                      return <View key={`blank-${index}`} style={styles.dayCell} />;
                    }
                    const isSelected = selectedDates.includes(item.dateStr);
                    const isToday = item.dateStr === todayStr;

                    return (
                      <TouchableOpacity
                        key={item.dateStr}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: theme.primary },
                          isToday && !isSelected && { borderWidth: 1, borderColor: theme.primary },
                        ]}
                        onPress={() => toggleDate(item.dateStr)}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.dayText,
                            { color: theme.textPrimary },
                            isSelected && { color: getContrastTextColor(theme.primary), fontWeight: '800' },
                            isToday && !isSelected && { color: theme.primary, fontWeight: '700' },
                          ]}>
                          {item.dayNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Contador de datas selecionadas */}
                <Text style={[styles.selectionCounter, { color: theme.primary }]}>
                  {selectedDates.length === 1
                    ? '1 data selecionada'
                    : `${selectedDates.length} datas selecionadas`}
                </Text>

                {/* Switch Google Agenda */}
                <View style={[styles.switchContainer, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={styles.switchInfo}>
                    <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Google Agenda</Text>
                    <Text style={[styles.switchSubtitle, { color: theme.textSecondary }]}>Sincronizar datas</Text>
                  </View>
                  <Switch
                    value={saveToGoogle}
                    onValueChange={setSaveToGoogle}
                    trackColor={{ false: theme.isDark ? '#334155' : '#CBD5E1', true: `${theme.primary}66` }}
                    thumbColor={saveToGoogle ? theme.primary : '#94A3B8'}
                    {...({ activeThumbColor: theme.primary } as any)}
                  />
                </View>

                {/* Ações */}
                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onDismiss}
                    activeOpacity={0.7}>
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      { backgroundColor: theme.primary },
                      selectedDates.length === 0 && styles.confirmButtonDisabled,
                    ]}
                    disabled={selectedDates.length === 0}
                    onPress={handleInitialConfirm}
                    activeOpacity={0.8}>
                    <Text style={[styles.confirmButtonText, { color: getContrastTextColor(theme.primary) }]}>
                      Aplicar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
  },
  dialogSubtitle: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: MomentusColors.textPrimary,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(52, 211, 153, 0.7)',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: MomentusColors.emeraldNeon,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: MomentusColors.emeraldNeon,
  },
  dayText: {
    fontSize: 13,
    color: MomentusColors.textPrimary,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#0F172A',
    fontWeight: '800',
  },
  dayTextToday: {
    color: MomentusColors.emeraldNeon,
    fontWeight: '700',
  },
  selectionCounter: {
    fontSize: 12,
    color: MomentusColors.emeraldNeon,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  switchInfo: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  switchSubtitle: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: MomentusColors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: MomentusColors.emeraldNeon,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  // Decisão de Reaplicação
  decisionContent: {
    gap: 14,
    paddingVertical: 4,
  },
  decisionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  decisionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  decisionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  conflictDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  conflictDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  conflictDateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  decisionPromptText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  decisionCardOption: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  decisionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  decisionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decisionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  recommendedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recommendedPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  decisionCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});

