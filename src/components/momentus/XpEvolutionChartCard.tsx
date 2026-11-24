import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  IconSize,
  MomentusColors,
  getContrastTextColor,
} from '@/constants/theme';
import type { AppTheme } from '@/context/MomentusContext';
import type { Achievement, HabitItem } from '@/types';
import {
  buildXpEvolutionSeries,
  formatCompactXp,
  type XpEvolutionRange,
} from '@/domain/xpEvolution';

interface XpEvolutionChartCardProps {
  habits: HabitItem[];
  focusHistoryMap: Record<string, number>;
  achievements: Achievement[];
  totalPoints: number;
  theme: AppTheme;
  onSelectPoint?: () => void;
}

const CHART_HEIGHT = 136;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;

/**
 * Gera uma curva suave (cubic Bezier) a partir de pontos (x, y) para estética neon fluida.
 */
function buildSmoothLinePath(coords: Array<{ x: number; y: number }>): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Gráfico Histórico de Evolução de XP (Linha Neon + Área Gradiente) em achievements.tsx.
 * Permite alternar entre o último mês (30 dias) e trimestre (90 dias) e inspecionar pontos ao toque.
 */
export const XpEvolutionChartCard: React.FC<XpEvolutionChartCardProps> = ({
  habits,
  focusHistoryMap,
  achievements,
  totalPoints,
  theme,
  onSelectPoint,
}) => {
  const [range, setRange] = useState<XpEvolutionRange>('30D');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(300);

  const summary = useMemo(
    () => buildXpEvolutionSeries(habits, focusHistoryMap, achievements, totalPoints, range),
    [habits, focusHistoryMap, achievements, totalPoints, range]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const w = Math.floor(event.nativeEvent.layout.width);
    if (w > 100 && Math.abs(w - chartWidth) > 2) {
      setChartWidth(w);
    }
  };

  const plotWidth = Math.max(120, chartWidth - PAD_LEFT - PAD_RIGHT);
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { coords, linePath, areaPath, yTicks } = useMemo(() => {
    const pts = summary.points;
    if (pts.length === 0) {
      return {
        coords: [],
        linePath: '',
        areaPath: '',
        yTicks: [
          { value: 0, y: PAD_TOP + plotHeight },
          { value: 50, y: PAD_TOP + plotHeight / 2 },
          { value: 100, y: PAD_TOP },
        ],
      };
    }

    const values = pts.map((p) => p.cumulativeXp);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    // Garante margem visual agradável mesmo quando a curva ainda está plana
    const span = rawMax - rawMin;
    const minVal = span === 0 ? Math.max(0, rawMin - 50) : Math.max(0, Math.floor(rawMin - span * 0.12));
    const maxVal = span === 0 ? Math.max(100, rawMax + 50) : Math.ceil(rawMax + span * 0.12);
    const safeSpan = Math.max(1, maxVal - minVal);

    const mappedCoords = pts.map((pt, idx) => {
      const ratioX = pts.length > 1 ? idx / (pts.length - 1) : 1;
      const ratioY = (pt.cumulativeXp - minVal) / safeSpan;
      return {
        x: PAD_LEFT + ratioX * plotWidth,
        y: PAD_TOP + plotHeight - ratioY * plotHeight,
      };
    });

    const smoothLine = buildSmoothLinePath(mappedCoords);
    const first = mappedCoords[0];
    const last = mappedCoords[mappedCoords.length - 1];
    const bottomY = PAD_TOP + plotHeight;
    const closedArea =
      mappedCoords.length > 1
        ? `${smoothLine} L ${last.x.toFixed(1)} ${bottomY} L ${first.x.toFixed(1)} ${bottomY} Z`
        : '';

    const midVal = Math.round((minVal + maxVal) / 2);

    return {
      coords: mappedCoords,
      linePath: smoothLine,
      areaPath: closedArea,
      yTicks: [
        { value: maxVal, y: PAD_TOP },
        { value: midVal, y: PAD_TOP + plotHeight / 2 },
        { value: minVal, y: bottomY },
      ],
    };
  }, [summary.points, plotWidth, plotHeight]);

  const activePointIndex =
    selectedIndex !== null && summary.points[selectedIndex]
      ? selectedIndex
      : summary.points.length - 1;
  const activePoint = summary.points[activePointIndex];
  const activeCoord = coords[activePointIndex];

  // Rótulos X espaçados (início, meio e hoje) para leitura limpa sem poluição
  const xLabels = useMemo(() => {
    const pts = summary.points;
    if (pts.length < 2) return [];
    const midIdx = Math.floor((pts.length - 1) / 2);
    return [
      { idx: 0, label: pts[0].shortLabel },
      { idx: midIdx, label: pts[midIdx].shortLabel },
      { idx: pts.length - 1, label: 'Hoje' },
    ];
  }, [summary.points]);

  const accentColor = theme.primary;
  const hasGrowth = summary.totalGainedInRange > 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
      {/* Cabeçalho + Seletor de Período (30d / Trimestre) */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <Ionicons name="analytics-outline" size={IconSize.sm} color={accentColor} />
            <Text style={[styles.title, { color: theme.textPrimary }]}>Evolução de XP</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {hasGrowth
              ? `+${summary.totalGainedInRange} XP nos últimos ${range === '30D' ? '30 dias' : '90 dias'}`
              : `Curva acumulada (${range === '30D' ? 'último mês' : 'trimestre'})`}
          </Text>
        </View>

        <View
          style={[
            styles.rangeToggle,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
          ]}>
          {(['30D', '90D'] as XpEvolutionRange[]).map((opt) => {
            const isActive = range === opt;
            const activeContrast = getContrastTextColor(accentColor);
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setRange(opt);
                  setSelectedIndex(null);
                  onSelectPoint?.();
                }}
                style={[styles.rangeBtn, isActive && { backgroundColor: accentColor }]}
                activeOpacity={0.75}>
                <Text
                  style={[
                    styles.rangeBtnText,
                    { color: isActive ? activeContrast : theme.textSecondary },
                    isActive && styles.rangeBtnTextActive,
                  ]}>
                  {opt === '30D' ? 'Mês' : 'Trimestre'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Leitura do Ponto Selecionado / Atual */}
      {activePoint && (
        <View
          style={[
            styles.readoutBar,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.outline },
          ]}>
          <View style={styles.readoutLeft}>
            <View style={[styles.readoutDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.readoutDate, { color: theme.textSecondary }]} numberOfLines={1}>
              {activePointIndex === summary.points.length - 1 ? 'Atual (Hoje)' : activePoint.fullLabel}
            </Text>
          </View>

          <View style={styles.readoutRight}>
            <Text style={[styles.readoutXp, { color: theme.textPrimary }]}>
              {activePoint.cumulativeXp} XP
            </Text>
            {activePoint.gainedXp > 0 && (
              <View style={[styles.readoutGainPill, { backgroundColor: `${accentColor}20` }]}>
                <Text style={[styles.readoutGainText, { color: accentColor }]}>
                  +{activePoint.gainedXp}
                </Text>
              </View>
            )}
            <Text style={[styles.readoutLevel, { color: MomentusColors.gold }]}>
              Nv. {activePoint.level}
            </Text>
          </View>
        </View>
      )}

      {/* Área SVG do Gráfico Neon */}
      <View style={styles.chartWrapper} onLayout={handleLayout}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="xpAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accentColor} stopOpacity={0.32} />
              <Stop offset="100%" stopColor={accentColor} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Linhas de Grade Horizontais Sutis */}
          {yTicks.map((tick, idx) => (
            <Line
              key={`grid-${idx}`}
              x1={PAD_LEFT}
              y1={tick.y}
              x2={chartWidth - PAD_RIGHT}
              y2={tick.y}
              stroke={theme.outline}
              strokeWidth={1}
              strokeDasharray="3,4"
              strokeOpacity={0.55}
            />
          ))}

          {/* Área Gradiente sob a Curva */}
          {areaPath ? <Path d={areaPath} fill="url(#xpAreaGradient)" /> : null}

          {/* Brilho Neon Suave (Glow) */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth={6}
              strokeOpacity={0.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Linha Principal Neon */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={accentColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Guia Vertical do Ponto Ativo */}
          {activeCoord && (
            <Line
              x1={activeCoord.x}
              y1={PAD_TOP}
              x2={activeCoord.x}
              y2={PAD_TOP + plotHeight}
              stroke={accentColor}
              strokeWidth={1}
              strokeDasharray="3,3"
              strokeOpacity={0.6}
            />
          )}

          {/* Pontos da Série */}
          {coords.map((pt, idx) => {
            const isSelected = idx === activePointIndex;
            const hasPointGain = (summary.points[idx]?.gainedXp || 0) > 0;
            if (!isSelected && !hasPointGain && idx !== 0 && idx !== coords.length - 1) {
              return null;
            }
            return (
              <React.Fragment key={`pt-${idx}`}>
                {isSelected && (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={9}
                    fill={accentColor}
                    fillOpacity={0.22}
                  />
                )}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 4.5 : 3}
                  fill={isSelected ? accentColor : theme.surface}
                  stroke={accentColor}
                  strokeWidth={2}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Rótulos do Eixo Y */}
        <View style={styles.yAxisOverlay} pointerEvents="none">
          {yTicks.map((tick, idx) => (
            <Text
              key={`ylabel-${idx}`}
              style={[
                styles.yAxisLabel,
                { color: theme.textSecondary, top: Math.max(0, tick.y - 7) },
              ]}>
              {formatCompactXp(tick.value)}
            </Text>
          ))}
        </View>

        {/* Zonas Tocáveis Invisíveis para Inspeção Interativa de Cada Checkpoint */}
        <View style={[styles.touchZonesRow, { left: PAD_LEFT, right: PAD_RIGHT }]}>
          {summary.points.map((pt, idx) => (
            <TouchableOpacity
              key={pt.dateStr}
              style={styles.touchZone}
              activeOpacity={0.6}
              onPress={() => {
                setSelectedIndex(idx);
                onSelectPoint?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${pt.fullLabel}: ${pt.cumulativeXp} XP`}
            />
          ))}
        </View>
      </View>

      {/* Rótulos do Eixo X */}
      <View style={[styles.xAxisRow, { paddingLeft: PAD_LEFT, paddingRight: PAD_RIGHT }]}>
        {xLabels.map((item) => (
          <Text key={`x-${item.idx}`} style={[styles.xAxisLabel, { color: theme.textSecondary }]}>
            {item.label}
          </Text>
        ))}
      </View>

      {/* Rodapé Compacto: Progressão de Nível & Dias Ativos */}
      <View style={[styles.footerRow, { borderTopColor: theme.outline }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          {summary.endLevel > summary.startLevel
            ? `🚀 Subiu do Nível ${summary.startLevel} para o Nível ${summary.endLevel}`
            : summary.activeDaysCount > 0
              ? `✨ ${summary.activeDaysCount} ${summary.activeDaysCount === 1 ? 'dia' : 'dias'} com ganho de XP no período`
              : 'Conclua hábitos ou sessões de foco para traçar sua curva de ascensão'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadiusTokens.card,
    borderWidth: 1,
    padding: SpacingTokens.md,
    marginBottom: SpacingTokens.md,
    gap: SpacingTokens.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SpacingTokens.sm,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  rangeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadiusTokens.sm,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  rangeBtn: {
    minHeight: ComponentHeightTokens.chip - 4,
    paddingHorizontal: SpacingTokens.sm,
    borderRadius: BorderRadiusTokens.xs,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  rangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rangeBtnTextActive: {
    fontWeight: '800',
  },
  readoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadiusTokens.control,
    borderWidth: 1,
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    gap: SpacingTokens.sm,
  },
  readoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    flex: 1,
  },
  readoutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readoutDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  readoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  readoutXp: {
    fontSize: 12,
    fontWeight: '800',
  },
  readoutGainPill: {
    paddingHorizontal: SpacingTokens.xs,
    paddingVertical: 2,
    borderRadius: BorderRadiusTokens.xs,
  },
  readoutGainText: {
    fontSize: 11,
    fontWeight: '800',
  },
  readoutLevel: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartWrapper: {
    width: '100%',
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yAxisOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PAD_LEFT - 4,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 11,
    fontWeight: '600',
  },
  touchZonesRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  touchZone: {
    flex: 1,
    height: '100%',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    borderTopWidth: 1,
    paddingTop: SpacingTokens.sm,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
});
