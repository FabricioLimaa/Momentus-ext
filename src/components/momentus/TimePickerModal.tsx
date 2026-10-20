import React, { useState, useEffect } from 'react';
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

interface TimePickerModalProps {
  visible: boolean;
  title?: string;
  initialTime?: string; // Format "HH:mm"
  onDismiss: () => void;
  onConfirm: (time: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title = 'Selecione a Hora',
  initialTime = '08:00',
  onDismiss,
  onConfirm,
}) => {
  const { theme } = useMomentus();

  const parseInitial = (timeStr: string) => {
    const parts = (timeStr || '08:00').split(':');
    const h = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 8));
    const m = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
    return { h, m };
  };

  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (visible) {
      const { h, m } = parseInitial(initialTime);
      setSelectedHour(h);
      setSelectedMinute(m);
      setActiveTab('hour');
    }
  }, [visible, initialTime]);

  const handleConfirm = () => {
    const hh = String(selectedHour).padStart(2, '0');
    const mm = String(selectedMinute).padStart(2, '0');
    onConfirm(`${hh}:${mm}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialogContainer, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Large Time Display */}
          <View style={styles.timeDisplayRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('hour')}
              activeOpacity={0.8}
              style={[
                styles.timeBlock,
                {
                  backgroundColor: activeTab === 'hour' ? `${theme.primary}20` : theme.surfaceElevated,
                  borderColor: activeTab === 'hour' ? theme.primary : theme.outline,
                },
              ]}>
              <Text
                style={[
                  styles.timeBlockText,
                  { color: activeTab === 'hour' ? theme.primary : theme.textPrimary },
                ]}>
                {String(selectedHour).padStart(2, '0')}
              </Text>
              <Text style={[styles.timeBlockLabel, { color: theme.textSecondary }]}>HORA</Text>
            </TouchableOpacity>

            <Text style={[styles.timeSeparator, { color: theme.textPrimary }]}>:</Text>

            <TouchableOpacity
              onPress={() => setActiveTab('minute')}
              activeOpacity={0.8}
              style={[
                styles.timeBlock,
                {
                  backgroundColor: activeTab === 'minute' ? `${theme.primary}20` : theme.surfaceElevated,
                  borderColor: activeTab === 'minute' ? theme.primary : theme.outline,
                },
              ]}>
              <Text
                style={[
                  styles.timeBlockText,
                  { color: activeTab === 'minute' ? theme.primary : theme.textPrimary },
                ]}>
                {String(selectedMinute).padStart(2, '0')}
              </Text>
              <Text style={[styles.timeBlockLabel, { color: theme.textSecondary }]}>MINUTO</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper adjustment (+ / -) */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => {
                if (activeTab === 'hour') {
                  setSelectedHour((prev) => (prev - 1 + 24) % 24);
                } else {
                  setSelectedMinute((prev) => (prev - 1 + 60) % 60);
                }
              }}
              style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
              <Ionicons name="remove" size={18} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.stepperLabel, { color: theme.textSecondary }]}>
              Ajuste fino {activeTab === 'hour' ? 'da Hora' : 'do Minuto'}
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (activeTab === 'hour') {
                  setSelectedHour((prev) => (prev + 1) % 24);
                } else {
                  setSelectedMinute((prev) => (prev + 1) % 60);
                }
              }}
              style={[styles.stepperBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.outline }]}>
              <Ionicons name="add" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Selection Grid */}
          <View style={styles.gridContainer}>
            <Text style={[styles.gridTitle, { color: theme.textSecondary }]}>
              {activeTab === 'hour' ? 'Selecione a hora (00h - 23h)' : 'Selecione os minutos'}
            </Text>

            <ScrollView
              style={styles.gridScroll}
              contentContainerStyle={styles.gridWrap}
              showsVerticalScrollIndicator={false}>
              {activeTab === 'hour'
                ? hours.map((h) => {
                    const isSelected = selectedHour === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        onPress={() => {
                          setSelectedHour(h);
                          setActiveTab('minute'); // Auto-avança para minutos para maior agilidade
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.gridItem,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surfaceElevated,
                            borderColor: isSelected ? theme.primary : theme.outline,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.gridItemText,
                            { color: isSelected ? '#0F172A' : theme.textPrimary, fontWeight: isSelected ? '700' : '500' },
                          ]}>
                          {String(h).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : minutes.map((m) => {
                    const isSelected = selectedMinute === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setSelectedMinute(m)}
                        activeOpacity={0.7}
                        style={[
                          styles.gridItem,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surfaceElevated,
                            borderColor: isSelected ? theme.primary : theme.outline,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.gridItemText,
                            { color: isSelected ? '#0F172A' : theme.textPrimary, fontWeight: isSelected ? '700' : '500' },
                          ]}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={[styles.actionsRow, { borderTopColor: theme.outline }]}>
            <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.confirmBtnText}>Confirmar</Text>
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
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeBlock: {
    width: 80,
    height: 70,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBlockText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  timeBlockLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 12,
  },
  gridContainer: {
    maxHeight: 180,
  },
  gridTitle: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  gridScroll: {
    maxHeight: 150,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  gridItem: {
    width: 44,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItemText: {
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
});
