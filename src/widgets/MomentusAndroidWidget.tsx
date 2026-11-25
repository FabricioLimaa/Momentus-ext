import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';
import type { MomentusWidgetSnapshot, MomentusWidgetTask } from './types';

interface MomentusAndroidWidgetProps {
  snapshot: MomentusWidgetSnapshot;
  widgetHeight?: number;
}

function toHexColor(color: string | undefined, fallback: ColorProp): ColorProp {
  if (color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)) {
    return color as ColorProp;
  }
  return fallback;
}

function getLiveClock(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function renderTaskRow(
  task: MomentusWidgetTask,
  index: number,
  colors: {
    cardBg: ColorProp;
    ongoingBg: ColorProp;
    primary: ColorProp;
    textPrimary: ColorProp;
    textSecondary: ColorProp;
    textMuted: ColorProp;
    borderSubtle: ColorProp;
  }
) {
  const accentColor = toHexColor(task.categoryColor, colors.primary);
  const isOngoingActive = task.isOngoing && !task.completed;

  return (
    <FlexWidget
      key={task.id || `task-${index}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: 'match_parent',
        backgroundColor: isOngoingActive ? colors.ongoingBg : colors.cardBg,
        borderColor: isOngoingActive ? colors.primary : colors.borderSubtle,
        borderWidth: isOngoingActive ? 1.5 : 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: index === 0 ? 0 : 6,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'momentus://home' }}
      accessibilityLabel={`Rotina ${task.title} às ${task.timeStart}`}>
      {/* Indicador lateral de cor da categoria */}
      <FlexWidget
        style={{
          width: 4,
          height: 28,
          borderRadius: 2,
          backgroundColor: accentColor,
          marginRight: 8,
        }}
      />

      {/* Título + Horário + Categoria */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
          }}>
          <TextWidget
            text={task.title}
            maxLines={1}
            truncate="END"
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: task.completed ? colors.textMuted : colors.textPrimary,
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 2,
          }}>
          <TextWidget
            text={
              isOngoingActive
                ? `${task.timeStart} • Agora • ${task.categoryName}`
                : `${task.timeStart} • ${task.categoryName}`
            }
            maxLines={1}
            truncate="END"
            style={{
              fontSize: 11,
              fontWeight: isOngoingActive ? '700' : '500',
              color: isOngoingActive ? colors.primary : colors.textSecondary,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Botão interativo de Check Rápido (1 toque sem abrir o app) */}
      <FlexWidget
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 8,
          backgroundColor: task.completed ? colors.primary : 'rgba(148, 163, 184, 0.14)',
          borderColor: task.completed ? colors.primary : colors.borderSubtle,
          borderWidth: 1.5,
        }}
        clickAction="TOGGLE_HABIT"
        clickActionData={{ habitId: task.id }}
        accessibilityLabel={
          task.completed
            ? `Desmarcar rotina ${task.title}`
            : `Concluir rotina ${task.title}`
        }>
        <TextWidget
          text={task.completed ? '✓' : '○'}
          style={{
            fontSize: task.completed ? 14 : 13,
            fontWeight: '700',
            color: task.completed ? '#0F172A' : colors.textSecondary,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

/**
 * Widget Nativo da Tela Inicial do Android (Momentus).
 * Exibe relógio, streak diário com barra de progresso e as próximas rotinas com check rápido em 1 toque.
 */
export function MomentusAndroidWidget({
  snapshot,
  widgetHeight = 160,
}: MomentusAndroidWidgetProps) {
  const isOled = snapshot.isOled === true;
  const isDark = isOled || snapshot.isDark !== false;
  const primary = toHexColor(snapshot.primaryColor, '#34D399');

  const colors: {
    bg: ColorProp;
    cardBg: ColorProp;
    ongoingBg: ColorProp;
    primary: ColorProp;
    textPrimary: ColorProp;
    textSecondary: ColorProp;
    textMuted: ColorProp;
    borderSubtle: ColorProp;
    streakBg: ColorProp;
    trackBg: ColorProp;
  } = isOled
    ? {
        bg: '#000000',
        cardBg: '#0B0B0F',
        ongoingBg: '#091F1A',
        primary,
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textMuted: '#6B7280',
        borderSubtle: '#1F2028',
        streakBg: '#0B0B0F',
        trackBg: '#1F2028',
      }
    : isDark
      ? {
          bg: '#0F172A',
          cardBg: '#1E293B',
          ongoingBg: '#132A2E',
          primary,
          textPrimary: '#F8FAFC',
          textSecondary: '#94A3B8',
          textMuted: '#64748B',
          borderSubtle: '#334155',
          streakBg: '#1E293B',
          trackBg: '#334155',
        }
      : {
          bg: '#F8FAFC',
          cardBg: '#FFFFFF',
          ongoingBg: '#ECFDF5',
          primary,
          textPrimary: '#0F172A',
          textSecondary: '#475569',
          textMuted: '#94A3B8',
          borderSubtle: '#E2E8F0',
          streakBg: '#FFFFFF',
          trackBg: '#E2E8F0',
        };

  const maxTasks = widgetHeight < 140 ? 1 : widgetHeight > 220 ? 3 : 2;
  const visibleTasks = snapshot.tasks.slice(0, maxTasks);
  const progressPct = Math.max(0, Math.min(100, Math.round((snapshot.progress || 0) * 100)));
  const filledFlex = progressPct > 0 ? progressPct : 0;
  const remainingFlex = Math.max(0, 100 - filledFlex);
  const liveClock = getLiveClock();
  const isAllDone = snapshot.totalCount > 0 && snapshot.completedCount >= snapshot.totalCount;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: colors.bg,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'momentus://home' }}
      accessibilityLabel="Widget Momentus — abrir aplicativo">
      {/* 1. Cabeçalho: Relógio + Data + Pill de Streak */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={liveClock}
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: colors.textPrimary,
            }}
          />
          <TextWidget
            text={`  •  ${snapshot.dateLabel}`}
            maxLines={1}
            truncate="END"
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.textSecondary,
            }}
          />
        </FlexWidget>

        {/* Pill de Streak Diário */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.streakBg,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
          <TextWidget
            text={`🔥 ${snapshot.currentStreak}d`}
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: snapshot.currentStreak > 0 ? '#F59E0B' : colors.textSecondary,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 2. Barra de Progresso Diário & Streak */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          marginTop: 8,
          marginBottom: 8,
        }}>
        <FlexWidget
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.trackBg,
            flexDirection: 'row',
            overflow: 'hidden',
          }}>
          {filledFlex > 0 && (
            <FlexWidget
              style={{
                flex: filledFlex,
                height: 6,
                backgroundColor: colors.primary,
                borderRadius: 3,
              }}
            />
          )}
          {remainingFlex > 0 && (
            <FlexWidget
              style={{
                flex: remainingFlex,
                height: 6,
              }}
            />
          )}
        </FlexWidget>

        <TextWidget
          text={`${snapshot.completedCount}/${snapshot.totalCount}`}
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: isAllDone ? colors.primary : colors.textSecondary,
            marginLeft: 8,
          }}
        />
      </FlexWidget>

      {/* 3. Próximas Tarefas em Destaque com Check Rápido */}
      <FlexWidget
        style={{
          flex: 1,
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task, idx) => renderTaskRow(task, idx, colors))
        ) : (
          <FlexWidget
            style={{
              width: 'match_parent',
              backgroundColor: colors.cardBg,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <TextWidget
              text={
                isAllDone
                  ? '✨ Todas as rotinas de hoje concluídas!'
                  : 'Nenhuma rotina agendada para hoje'
              }
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: isAllDone ? colors.primary : colors.textSecondary,
                textAlign: 'center',
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
