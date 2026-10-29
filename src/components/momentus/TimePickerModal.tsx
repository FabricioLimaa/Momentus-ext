import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMomentus } from '@/context/MomentusContext';
import {
  getContrastTextColor,
  BorderRadiusTokens,
  ComponentHeightTokens,
} from '@/constants/theme';

interface TimePickerModalProps {
  visible: boolean;
  title?: string;
  initialTime?: string; // Formato "HH:mm"
  onDismiss: () => void;
  onConfirm: (time: string) => void;
}

const ITEM_HEIGHT = 40;
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

  const parseInitial = useCallback((timeStr: string) => {
    const parts = (timeStr || '08:00').split(':');
    const h = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 8));
    const m = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
    return { h, m };
  }, []);

  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [inputText, setInputText] = useState('08:00');

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const scrollWheelTo = useCallback((h: number, m: number, animated = true) => {
    const hourY = Math.max(0, (h - 1) * ITEM_HEIGHT);
    const minuteIndex = MINUTES_STEP_5.findIndex((step) => step >= m);
    const minuteY = Math.max(0, ((minuteIndex >= 0 ? minuteIndex : 0) - 1) * ITEM_HEIGHT);
    hourScrollRef.current?.scrollTo({ y: hourY, animated });
    minuteScrollRef.current?.scrollTo({ y: minuteY, animated });
  }, []);

  useEffect(() => {
    if (visible) {
      const { h, m } = parseInitial(initialTime);
      setSelectedHour(h);
      setSelectedMinute(m);
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      setInputText(formatted);

      const timer = setTimeout(() => {
        scrollWheelTo(h, m, false);
      }, 60);

      return () => clearTimeout(timer);
    }
  }, [visible, initialTime, parseInitial, scrollWheelTo]);

  const handleConfirm = useCallback(() => {
    const hh = String(selectedHour).padStart(2, '0');
    const mm = String(selectedMinute).padStart(2, '0');
    triggerHaptic('success');
    onConfirm(`${hh}:${mm}`);
  }, [selectedHour, selectedMinute, triggerHaptic, onConfirm]);

  // Teclado físico no Web (Enter confirma, Escape fecha)
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyDown = (e: any) => {
        if (e.key === 'Enter') {
          handleConfirm();
        } else if (e.key === 'Escape') {
          onDismiss();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleConfirm, onDismiss]);

  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    const formatted = `${String(h).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
    setInputText(formatted);
    triggerHaptic('impact');
  };

  const handleSelectMinute = (m: number) => {
    setSelectedMinute(m);
    const formatted = `${String(selectedHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setInputText(formatted);
    triggerHaptic('impact');
  };

  const handleDirectInput = (val: string) => {
    // Permite digitação com máscara HH:mm
    let clean = val.replace(/[^0-9]/g, '');
    if (clean.length > 4) clean = clean.substring(0, 4);

    let formatted = clean;
    if (clean.length >= 3) {
      formatted = `${clean.substring(0, 2)}:${clean.substring(2)}`;
    }
    setInputText(formatted);

    if (clean.length === 4) {
      const h = parseInt(clean.substring(0, 2), 10);
      const m = parseInt(clean.substring(2, 4), 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setSelectedHour(h);
        setSelectedMinute(m);
        scrollWheelTo(h, m, true);
        triggerHaptic('impact');
      }
    }
  };

  // Ajustes rápidos (+15m, +30m, Agora)
  const handleQuickAdd = (minutesDelta: number) => {
    const totalMinutes = selectedHour * 60 + selectedMinute + minutesDelta;
    const normalized = (totalMinutes % 1440 + 1440) % 1440;
    const newH = Math.floor(normalized / 60);
    const newM = normalized % 60;
    setSelectedHour(newH);
    setSelectedMinute(newM);
    setInputText(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    triggerHaptic('impact');
    scrollWheelTo(newH, newM, true);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = now.getHours();
    const rawM = now.getMinutes();
    const roundedM = (Math.round(rawM / 5) * 5) % 60;
    setSelectedHour(h);
    setSelectedMinute(roundedM);
    setInputText(`${String(h).padStart(2, '0')}:${String(roundedM).padStart(2, '0')}`);
    triggerHaptic('impact');
    scrollWheelTo(h, roundedM, true);
  };

  // Identificação do período
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
          {/* Cabeçalho Minimalista */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBg, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="time" size={16} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.closeButton, { backgroundColor: theme.surfaceElevated }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Display Digital Minimalista com Digitação Direta Inteligente */}
          <View style={[styles.digitalDisplayCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
            <TextInput
              style={[
                styles.digitalInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)',
                  borderColor: `${theme.primary}40`,
                },
              ]}
              value={inputText}
              onChangeText={handleDirectInput}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              selectTextOnFocus
              placeholder="08:00"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleConfirm}
            />
            <Text style={[styles.periodHintText, { color: theme.textSecondary }]}>
              {periodLabel} • Digite ou role abaixo
            </Text>
          </View>

          {/* Colunas Duplas de Rolagem Wheel-Like (Horas e Minutos) */}
          <View style={[styles.columnsContainer, { borderColor: theme.outline, backgroundColor: theme.surfaceElevated }]}>
            {/* Coluna Horas */}
            <View style={styles.columnCol}>
              <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>HORA</Text>
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

            {/* Divisor vertical */}
            <View style={[styles.columnDivider, { backgroundColor: theme.outline }]} />

            {/* Coluna Minutos */}
            <View style={styles.columnCol}>
              <Text style={[styles.columnHeaderText, { color: theme.textSecondary }]}>MINUTO</Text>
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
            </View>
          </View>

          {/* Chips de Atalho Rápido */}
          <View style={styles.quickChipsRow}>
            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={handleSetNow}
              activeOpacity={0.7}>
              <Ionicons name="flash-outline" size={11} color={theme.primary} />
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>Agora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={() => handleQuickAdd(15)}
              activeOpacity={0.7}>
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>+15m</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}
              onPress={() => handleQuickAdd(30)}
              activeOpacity={0.7}>
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>+30m</Text>
            </TouchableOpacity>
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
              <Text style={[styles.confirmBtnText, { color: contrastColor }]}>Confirmar</Text>
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
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    padding: 18,
    gap: 12,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitalDisplayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  digitalInput: {
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    width: 140,
  },
  periodHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  columnsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    height: 150,
    overflow: 'hidden',
  },
  columnCol: {
    flex: 1,
    alignItems: 'center',
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingVertical: 6,
  },
  columnDivider: {
    width: 1,
    height: '100%',
  },
  columnScroll: {
    flex: 1,
    width: '100%',
  },
  columnScrollContent: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  pickerItem: {
    width: 60,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  pickerItemSelected: {
    borderRadius: 12,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pickerItemTextSelected: {
    fontWeight: '900',
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
