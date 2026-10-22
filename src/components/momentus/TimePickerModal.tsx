import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMomentus } from '@/context/MomentusContext';
import { getContrastTextColor } from '@/constants/theme';

interface TimePickerModalProps {
  visible: boolean;
  title?: string;
  initialTime?: string; // Formato "HH:mm"
  onDismiss: () => void;
  onConfirm: (time: string) => void;
}

const ITEM_HEIGHT = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_STEP_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title = 'Selecione o Horário',
  initialTime = '08:00',
  onDismiss,
  onConfirm,
}) => {
  const { theme, triggerHaptic } = useMomentus();

  const parseInitial = (timeStr: string) => {
    const parts = (timeStr || '08:00').split(':');
    const h = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 8));
    const m = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
    return { h, m };
  };

  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      const { h, m } = parseInitial(initialTime);
      setSelectedHour(h);
      setSelectedMinute(m);

      // Auto-centraliza suavemente os seletores na hora e minuto atuais
      const timer = setTimeout(() => {
        const hourY = Math.max(0, (h - 1) * ITEM_HEIGHT);
        const minuteIndex = MINUTES_STEP_5.findIndex((step) => step >= m);
        const minuteY = Math.max(0, ((minuteIndex >= 0 ? minuteIndex : 0) - 1) * ITEM_HEIGHT);

        hourScrollRef.current?.scrollTo({ y: hourY, animated: false });
        minuteScrollRef.current?.scrollTo({ y: minuteY, animated: false });
      }, 60);

      return () => clearTimeout(timer);
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    const hh = String(selectedHour).padStart(2, '0');
    const mm = String(selectedMinute).padStart(2, '0');
    triggerHaptic('success');
    onConfirm(`${hh}:${mm}`);
  };

  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    triggerHaptic('impact');
  };

  const handleSelectMinute = (m: number) => {
    setSelectedMinute(m);
    triggerHaptic('impact');
  };

  // Ajustes rápidos (+15m, +30m, +1h, Agora)
  const handleQuickAdd = (minutesDelta: number) => {
    const totalMinutes = selectedHour * 60 + selectedMinute + minutesDelta;
    const normalized = (totalMinutes % 1440 + 1440) % 1440;
    const newH = Math.floor(normalized / 60);
    const newM = normalized % 60;
    setSelectedHour(newH);
    setSelectedMinute(newM);
    triggerHaptic('impact');

    const hourY = Math.max(0, (newH - 1) * ITEM_HEIGHT);
    const minuteIndex = MINUTES_STEP_5.findIndex((step) => step >= newM);
    const minuteY = Math.max(0, ((minuteIndex >= 0 ? minuteIndex : 0) - 1) * ITEM_HEIGHT);
    hourScrollRef.current?.scrollTo({ y: hourY, animated: true });
    minuteScrollRef.current?.scrollTo({ y: minuteY, animated: true });
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = now.getHours();
    const rawM = now.getMinutes();
    const roundedM = Math.round(rawM / 5) * 5 % 60;
    setSelectedHour(h);
    setSelectedMinute(roundedM);
    triggerHaptic('impact');

    const hourY = Math.max(0, (h - 1) * ITEM_HEIGHT);
    const minuteIndex = MINUTES_STEP_5.indexOf(roundedM);
    const minuteY = Math.max(0, ((minuteIndex >= 0 ? minuteIndex : 0) - 1) * ITEM_HEIGHT);
    hourScrollRef.current?.scrollTo({ y: hourY, animated: true });
    minuteScrollRef.current?.scrollTo({ y: minuteY, animated: true });
  };

  // Identificação amigável do período do dia
  const periodLabel = (() => {
    if (selectedHour >= 5 && selectedHour < 12) return 'Manhã ☀️';
    if (selectedHour >= 12 && selectedHour < 18) return 'Tarde 🌤️';
    if (selectedHour >= 18 && selectedHour < 24) return 'Noite 🌙';
    return 'Madrugada 🌌';
  })();

  const contrastColor = getContrastTextColor(theme.primary);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialogContainer, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBg, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="time" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.closeButton, { backgroundColor: theme.surfaceElevated }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Display Digital Minimalista */}
          <View style={[styles.digitalDisplayCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
            <View style={styles.digitalRow}>
              <View style={[styles.digitalPill, { borderColor: `${theme.primary}40`, backgroundColor: `${theme.primary}12` }]}>
                <Text style={[styles.digitalNumber, { color: theme.textPrimary }]}>
                  {String(selectedHour).padStart(2, '0')}
                </Text>
                <Text style={[styles.digitalTag, { color: theme.primary }]}>HORA</Text>
              </View>

              <Text style={[styles.digitalDots, { color: theme.primary }]}>:</Text>

              <View style={[styles.digitalPill, { borderColor: `${theme.primary}40`, backgroundColor: `${theme.primary}12` }]}>
                <Text style={[styles.digitalNumber, { color: theme.textPrimary }]}>
                  {String(selectedMinute).padStart(2, '0')}
                </Text>
                <Text style={[styles.digitalTag, { color: theme.primary }]}>MIN</Text>
              </View>
            </View>

            <View style={[styles.periodBadge, { backgroundColor: `${theme.primary}15` }]}>
              <Text style={[styles.periodText, { color: theme.primary }]}>{periodLabel}</Text>
            </View>
          </View>

          {/* Chips de Atalho Rápido */}
          <View style={styles.quickChipsRow}>
            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={handleSetNow}
              activeOpacity={0.7}>
              <Ionicons name="flash-outline" size={12} color={theme.primary} />
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>Agora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={() => handleQuickAdd(15)}
              activeOpacity={0.7}>
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>+15 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={() => handleQuickAdd(30)}
              activeOpacity={0.7}>
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>+30 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={() => handleQuickAdd(60)}
              activeOpacity={0.7}>
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>+1 hora</Text>
            </TouchableOpacity>
          </View>

          {/* Colunas Duplas de Seleção: Horas e Minutos Lado a Lado */}
          <View style={[styles.columnsContainer, { borderColor: theme.outline, backgroundColor: theme.surfaceElevated }]}>
            {/* Coluna Horas */}
            <View style={styles.columnCol}>
              <View style={styles.columnHeader}>
                <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>HORA</Text>
              </View>
              <ScrollView
                ref={hourScrollRef}
                style={styles.columnScroll}
                contentContainerStyle={styles.columnScrollContent}
                showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => {
                  const isSelected = selectedHour === h;
                  return (
                    <TouchableOpacity
                      key={`hour-${h}`}
                      style={[
                        styles.pickerItem,
                        isSelected && [styles.pickerItemSelected, { backgroundColor: theme.primary }],
                      ]}
                      onPress={() => handleSelectHour(h)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: isSelected ? contrastColor : theme.textPrimary },
                          isSelected && styles.pickerItemTextSelected,
                        ]}>
                        {String(h).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Separador Vertical Suave */}
            <View style={[styles.columnDivider, { backgroundColor: theme.outline }]} />

            {/* Coluna Minutos */}
            <View style={styles.columnCol}>
              <View style={styles.columnHeader}>
                <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>MINUTO</Text>
              </View>
              <ScrollView
                ref={minuteScrollRef}
                style={styles.columnScroll}
                contentContainerStyle={styles.columnScrollContent}
                showsVerticalScrollIndicator={false}>
                {MINUTES_STEP_5.map((m) => {
                  const isSelected = selectedMinute === m;
                  return (
                    <TouchableOpacity
                      key={`minute-${m}`}
                      style={[
                        styles.pickerItem,
                        isSelected && [styles.pickerItemSelected, { backgroundColor: theme.primary }],
                      ]}
                      onPress={() => handleSelectMinute(m)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: isSelected ? contrastColor : theme.textPrimary },
                          isSelected && styles.pickerItemTextSelected,
                        ]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Botões de Ajuste Fino (+/- 1m) */}
              <View style={[styles.stepperRow, { borderTopColor: theme.outline }]}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                  onPress={() => handleQuickAdd(-1)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="remove" size={14} color={theme.textPrimary} />
                </TouchableOpacity>

                <Text style={[styles.stepperText, { color: theme.textSecondary }]}>±1m</Text>

                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                  onPress={() => handleQuickAdd(1)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="add" size={14} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={[styles.actionsRow, { borderTopColor: theme.outline }]}>
            <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.85}>
              <Ionicons name="checkmark" size={16} color={contrastColor} />
              <Text style={[styles.confirmBtnText, { color: contrastColor }]}>Confirmar Horário</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitalDisplayCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  digitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitalPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  digitalNumber: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  digitalTag: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  digitalDots: {
    fontSize: 26,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  periodBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  columnsContainer: {
    flexDirection: 'row',
    height: 190,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  columnCol: {
    flex: 1,
    paddingVertical: 6,
  },
  columnHeader: {
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  columnScroll: {
    flex: 1,
  },
  columnScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  columnDivider: {
    width: 1,
    height: '100%',
  },
  pickerItem: {
    height: ITEM_HEIGHT - 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  pickerItemTextSelected: {
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 6,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
