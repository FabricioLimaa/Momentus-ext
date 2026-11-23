import React from 'react';
import { Platform } from 'react-native';
import {
  Button,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  opacity,
  padding,
  shapes,
  strikethrough,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { Widget, WidgetEnvironment } from 'expo-widgets';
import { MOMENTUS_WIDGET_NAME, type MomentusWidgetSnapshot, type MomentusWidgetTask } from './types';

/**
 * Layout nativo SwiftUI (WidgetKit) compilado em bundle isolado pela diretiva `'widget'`.
 * IMPORTANTE: Nenhuma constante ou função fora deste escopo pode ser referenciada aqui dentro.
 */
const MomentusIosWidgetLayout = (
  props: MomentusWidgetSnapshot,
  environment: WidgetEnvironment
) => {
  'widget';

  const isDark =
    typeof props.isDark === 'boolean' ? props.isDark : environment.colorScheme === 'dark';
  const primary = props.primaryColor || '#34D399';
  const bg = isDark ? '#0F172A' : '#F8FAFC';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const ongoingBg = isDark ? '#132A2E' : '#ECFDF5';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#475569';
  const streakAmber = '#F59E0B';

  const tasks: MomentusWidgetTask[] = Array.isArray(props.tasks) ? props.tasks : [];
  const totalCount = typeof props.totalCount === 'number' ? props.totalCount : tasks.length;
  const completedCount = typeof props.completedCount === 'number' ? props.completedCount : 0;
  const currentStreak = typeof props.currentStreak === 'number' ? props.currentStreak : 0;
  const progress =
    typeof props.progress === 'number'
      ? Math.max(0, Math.min(1, props.progress))
      : totalCount > 0
        ? Math.max(0, Math.min(1, completedCount / totalCount))
        : 0;
  const isAllDone = totalCount > 0 && completedCount >= totalCount;

  const envDate = environment.date instanceof Date ? environment.date : new Date();
  const hh = String(envDate.getHours()).padStart(2, '0');
  const mm = String(envDate.getMinutes()).padStart(2, '0');
  const liveClock = `${hh}:${mm}`;
  const dateLabel = props.dateLabel || 'Hoje';

  const toggleTask = (habitId: string): MomentusWidgetSnapshot => {
    const nextTasks = tasks.map((t) =>
      t.id === habitId ? { ...t, completed: !t.completed } : t
    );
    const target = tasks.find((t) => t.id === habitId);
    const delta = target ? (target.completed ? -1 : 1) : 0;
    const nextCompleted = Math.max(0, Math.min(totalCount, completedCount + delta));
    const nextProgress = totalCount > 0 ? Math.max(0, Math.min(1, nextCompleted / totalCount)) : 0;

    const prevToggles = Array.isArray(props.toggledHabitIds) ? props.toggledHabitIds : [];
    const nextToggles = prevToggles.includes(habitId)
      ? prevToggles.filter((id) => id !== habitId)
      : [...prevToggles, habitId];

    return {
      ...props,
      tasks: nextTasks,
      completedCount: nextCompleted,
      progress: nextProgress,
      toggledHabitIds: nextToggles,
    };
  };

  // 1. Família Pequena (systemSmall): Relógio + Streak + Próxima Tarefa + Check Rápido + Barra
  if (environment.widgetFamily === 'systemSmall') {
    const featuredTask = tasks.find((t) => t.isOngoing && !t.completed) || tasks[0];

    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
          containerBackground(bg, 'widget'),
          widgetURL('momentus://home'),
        ]}>
        {/* Cabeçalho Compacto */}
        <HStack alignment="center" spacing={4}>
          <Text
            modifiers={[
              font({ size: 16, weight: 'bold' }),
              foregroundStyle(textPrimary),
            ]}>
            {liveClock}
          </Text>
          <Spacer />
          <HStack
            alignment="center"
            spacing={3}
            modifiers={[
              padding({ horizontal: 6, vertical: 3 }),
              background(cardBg, shapes.capsule()),
            ]}>
            <Image
              systemName="flame.fill"
              size={11}
              color={currentStreak > 0 ? streakAmber : textSecondary}
            />
            <Text
              modifiers={[
                font({ size: 11, weight: 'bold' }),
                foregroundStyle(currentStreak > 0 ? streakAmber : textSecondary),
              ]}>
              {`${currentStreak}d`}
            </Text>
          </HStack>
        </HStack>

        {/* Tarefa em Destaque */}
        {featuredTask ? (
          <VStack
            alignment="leading"
            spacing={6}
            modifiers={[
              padding({ all: 8 }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
              background(
                featuredTask.isOngoing && !featuredTask.completed ? ongoingBg : cardBg,
                shapes.roundedRectangle({ cornerRadius: 12 })
              ),
            ]}>
            <HStack alignment="center" spacing={4}>
              <Text
                modifiers={[
                  font({ size: 11, weight: 'semibold' }),
                  foregroundStyle(
                    featuredTask.isOngoing && !featuredTask.completed ? primary : textSecondary
                  ),
                ]}>
                {featuredTask.isOngoing && !featuredTask.completed
                  ? `${featuredTask.timeStart} • Agora`
                  : featuredTask.timeStart}
              </Text>
              <Spacer />
              <Button
                target={`toggle:${featuredTask.id}`}
                onPress={() => toggleTask(featuredTask.id)}
                modifiers={[buttonStyle('plain')]}>
                <Image
                  systemName={featuredTask.completed ? 'checkmark.circle.fill' : 'circle'}
                  size={18}
                  color={featuredTask.completed ? primary : textSecondary}
                />
              </Button>
            </HStack>

            <Text
              modifiers={[
                font({ size: 13, weight: 'bold' }),
                foregroundStyle(featuredTask.completed ? textSecondary : textPrimary),
                lineLimit(2),
                strikethrough({ isActive: featuredTask.completed, pattern: 'solid' }),
              ]}>
              {featuredTask.title}
            </Text>
          </VStack>
        ) : (
          <VStack
            alignment="leading"
            spacing={4}
            modifiers={[
              padding({ all: 8 }),
              frame({ maxWidth: Infinity, alignment: 'leading' }),
              background(cardBg, shapes.roundedRectangle({ cornerRadius: 12 })),
            ]}>
            <Text
              modifiers={[
                font({ size: 12, weight: 'semibold' }),
                foregroundStyle(isAllDone ? primary : textSecondary),
                lineLimit(2),
              ]}>
              {isAllDone ? 'Dia concluído!' : 'Sem rotinas hoje'}
            </Text>
          </VStack>
        )}

        <Spacer />

        {/* Barra de Progresso Diário */}
        <VStack alignment="leading" spacing={4}>
          <HStack alignment="center">
            <Text
              modifiers={[
                font({ size: 10, weight: 'medium' }),
                foregroundStyle(textSecondary),
              ]}>
              Progresso
            </Text>
            <Spacer />
            <Text
              modifiers={[
                font({ size: 10, weight: 'bold' }),
                foregroundStyle(isAllDone ? primary : textPrimary),
              ]}>
              {`${completedCount}/${totalCount}`}
            </Text>
          </HStack>
          <ProgressView value={progress} modifiers={[tint(primary)]} />
        </VStack>
      </VStack>
    );
  }

  // 2. Famílias Média (systemMedium) e Grande (systemLarge)
  const maxVisibleTasks = environment.widgetFamily === 'systemLarge' ? 4 : 2;
  const visibleTasks = tasks.slice(0, maxVisibleTasks);

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(bg, 'widget'),
        widgetURL('momentus://home'),
      ]}>
      {/* Cabeçalho: Relógio + Data + Streak */}
      <HStack alignment="center" spacing={6}>
        <Text
          modifiers={[
            font({ size: 18, weight: 'bold' }),
            foregroundStyle(textPrimary),
          ]}>
          {liveClock}
        </Text>
        <Text
          modifiers={[
            font({ size: 12, weight: 'medium' }),
            foregroundStyle(textSecondary),
            lineLimit(1),
          ]}>
          {`• ${dateLabel}`}
        </Text>
        <Spacer />
        <HStack
          alignment="center"
          spacing={4}
          modifiers={[
            padding({ horizontal: 8, vertical: 4 }),
            background(cardBg, shapes.capsule()),
          ]}>
          <Image
            systemName="flame.fill"
            size={12}
            color={currentStreak > 0 ? streakAmber : textSecondary}
          />
          <Text
            modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundStyle(currentStreak > 0 ? streakAmber : textSecondary),
            ]}>
            {`${currentStreak}d`}
          </Text>
        </HStack>
      </HStack>

      {/* Barra de Streak & Progresso Diário */}
      <HStack alignment="center" spacing={8}>
        <ProgressView value={progress} modifiers={[tint(primary)]} />
        <Text
          modifiers={[
            font({ size: 11, weight: 'bold' }),
            foregroundStyle(isAllDone ? primary : textSecondary),
          ]}>
          {`${completedCount}/${totalCount}`}
        </Text>
      </HStack>

      {/* Lista de Próximas Tarefas com Check Interativo */}
      {visibleTasks.length > 0 ? (
        <VStack alignment="leading" spacing={6}>
          {visibleTasks.map((task) => {
            const isOngoingActive = task.isOngoing && !task.completed;
            const accent = task.categoryColor || primary;

            return (
              <HStack
                key={task.id}
                alignment="center"
                spacing={8}
                modifiers={[
                  padding({ horizontal: 10, vertical: 7 }),
                  frame({ maxWidth: Infinity, alignment: 'leading' }),
                  background(
                    isOngoingActive ? ongoingBg : cardBg,
                    shapes.roundedRectangle({ cornerRadius: 12 })
                  ),
                  opacity(task.completed ? 0.65 : 1),
                ]}>
                <VStack
                  modifiers={[
                    frame({ width: 4, height: 24 }),
                    background(accent, shapes.capsule()),
                  ]}>
                  <Spacer />
                </VStack>

                <VStack alignment="leading" spacing={2}>
                  <Text
                    modifiers={[
                      font({ size: 13, weight: 'bold' }),
                      foregroundStyle(task.completed ? textSecondary : textPrimary),
                      lineLimit(1),
                      strikethrough({ isActive: task.completed, pattern: 'solid' }),
                    ]}>
                    {task.title}
                  </Text>
                  <Text
                    modifiers={[
                      font({ size: 11, weight: isOngoingActive ? 'semibold' : 'regular' }),
                      foregroundStyle(isOngoingActive ? primary : textSecondary),
                      lineLimit(1),
                    ]}>
                    {isOngoingActive
                      ? `${task.timeStart} • Agora • ${task.categoryName}`
                      : `${task.timeStart} • ${task.categoryName}`}
                  </Text>
                </VStack>

                <Spacer />

                <Button
                  target={`toggle:${task.id}`}
                  onPress={() => toggleTask(task.id)}
                  modifiers={[buttonStyle('plain')]}>
                  <Image
                    systemName={task.completed ? 'checkmark.circle.fill' : 'circle'}
                    size={22}
                    color={task.completed ? primary : textSecondary}
                  />
                </Button>
              </HStack>
            );
          })}
        </VStack>
      ) : (
        <VStack
          alignment="center"
          spacing={4}
          modifiers={[
            padding({ all: 12 }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'center' }),
            background(cardBg, shapes.roundedRectangle({ cornerRadius: 12 })),
          ]}>
          <Text
            modifiers={[
              font({ size: 13, weight: 'semibold' }),
              foregroundStyle(isAllDone ? primary : textSecondary),
            ]}>
            {isAllDone
              ? 'Todas as rotinas de hoje concluídas!'
              : 'Nenhuma rotina agendada para hoje'}
          </Text>
        </VStack>
      )}

      <Spacer />
    </VStack>
  );
};

let cachedIosWidget: Widget<MomentusWidgetSnapshot> | null | undefined;

/**
 * Instancia e retorna o WidgetKit iOS de forma segura (lazy).
 * Retorna `null` na Web, no Android ou no Expo Go onde o módulo nativo ExpoWidgets não existe.
 */
export function getMomentusIosWidget(): Widget<MomentusWidgetSnapshot> | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  if (cachedIosWidget !== undefined) {
    return cachedIosWidget;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createWidget } = require('expo-widgets') as typeof import('expo-widgets');
    cachedIosWidget = createWidget<MomentusWidgetSnapshot>(
      MOMENTUS_WIDGET_NAME,
      MomentusIosWidgetLayout
    );
    return cachedIosWidget;
  } catch {
    cachedIosWidget = null;
    return null;
  }
}

export { MomentusIosWidgetLayout };
