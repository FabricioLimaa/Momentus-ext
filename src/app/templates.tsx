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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { RoutineTemplate } from '@/types';

export default function TemplatesScreen() {
  const { templates, categories, applyTemplateToToday } = useMomentus();
  const [expandedId, setExpandedId] = useState<string | null>(templates[0]?.id || null);

  const handleApply = (template: RoutineTemplate) => {
    applyTemplateToToday(template.id);
    Alert.alert(
      'Rotina Aplicada! 🚀',
      `As ${template.items.length} atividades de "${template.title}" foram adicionadas à sua lista de hoje!`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={MomentusColors.navyBackground} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Modelos de Rotina</Text>
          <Text style={styles.subtitle}>
            Carregue blocos de hábitos prontos com 1 toque
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {templates.map((template) => {
            const isExpanded = expandedId === template.id;
            const totalDuration = template.items.reduce(
              (acc, item) => acc + item.durationMinutes,
              0
            );

            return (
              <View key={template.id} style={styles.templateCard}>
                {/* Header Row */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedId(isExpanded ? null : template.id)}
                  style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: `${template.color}25` },
                      ]}>
                      <Ionicons
                        name={template.icon as any}
                        size={24}
                        color={template.color}
                      />
                    </View>
                    <View style={styles.titleGroup}>
                      <Text style={styles.cardTitle}>{template.title}</Text>
                      <Text style={styles.cardMeta}>
                        {template.items.length} hábitos • ~{totalDuration} min
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={MomentusColors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Description */}
                <Text style={styles.cardDesc}>{template.description}</Text>

                {/* Expanded Items */}
                {isExpanded && (
                  <View style={styles.itemsList}>
                    <Text style={styles.itemsSectionTitle}>Atividades Incluídas:</Text>
                    {template.items.map((item, idx) => {
                      const cat = categories.find((c) => c.id === item.categoryId);
                      return (
                        <View key={item.id} style={styles.subItemRow}>
                          <View style={styles.subItemIndex}>
                            <Text style={styles.subItemIndexText}>{idx + 1}</Text>
                          </View>
                          <View style={styles.subItemContent}>
                            <Text style={styles.subItemTitle}>{item.title}</Text>
                            <View style={styles.subItemBadges}>
                              {cat && (
                                <Text style={[styles.subItemCategory, { color: cat.color }]}>
                                  {cat.name}
                                </Text>
                              )}
                              <Text style={styles.subItemDuration}>
                                • {item.durationMinutes} min ({item.timeStart})
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Apply Button */}
                <TouchableOpacity
                  onPress={() => handleApply(template)}
                  style={styles.applyBtn}
                  activeOpacity={0.8}>
                  <Ionicons name="flash" size={16} color="#0F172A" />
                  <Text style={styles.applyBtnText}>Aplicar para Hoje (+20 XP)</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    paddingTop: 12,
    marginBottom: 16,
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
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  cardTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardMeta: {
    color: MomentusColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  cardDesc: {
    color: MomentusColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: MomentusColors.navyOutline,
    paddingTop: 12,
    marginBottom: 14,
    gap: 10,
  },
  itemsSectionTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: 10,
    borderRadius: 12,
  },
  subItemIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MomentusColors.navyOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subItemIndexText: {
    color: MomentusColors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  subItemContent: {
    flex: 1,
  },
  subItemTitle: {
    color: MomentusColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  subItemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  subItemCategory: {
    fontSize: 11,
    fontWeight: '600',
  },
  subItemDuration: {
    color: MomentusColors.textSecondary,
    fontSize: 11,
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
    fontWeight: 'bold',
    fontSize: 14,
  },
});

