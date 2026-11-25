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
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type {
  LiveActivityEnvironment,
  LiveActivityFactory,
  LiveActivityLayout,
} from 'expo-widgets';

export const MOMENTUS_FOCUS_LIVE_ACTIVITY_NAME = 'MomentusFocusLiveActivity';

export interface FocusLiveActivityProps {
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  modeLabel: string;
  habitTitle: string;
  isRunning: boolean;
  startTimestampMs: number;
  endTimestampMs: number;
  remainingFormatted: string;
  progress: number;
  accentColor: string;
  isOled?: boolean;
}

/**
 * Layout nativo SwiftUI (ActivityKit / Dynamic Island + Lock Screen) compilado pela diretiva `'widget'`.
 * IMPORTANTE: Nenhuma variável ou função externa fora deste escopo pode ser referenciada aqui dentro.
 */
const MomentusFocusLiveActivityLayout = (
  props: FocusLiveActivityProps,
  _environment: LiveActivityEnvironment
): LiveActivityLayout => {
  'widget';

  const isRunning = props.isRunning !== false;
  const isBreak = props.mode === 'SHORT_BREAK' || props.mode === 'LONG_BREAK';
  const accent = props.accentColor || '#34D399';
  const isOled = props.isOled === true;
  const cardBg = isOled ? '#000000' : '#0F172A';
  const btnBg = isOled ? '#14141A' : '#1E293B';
  const modeLabel = props.modeLabel || (isBreak ? 'Pausa' : 'Foco Profundo');
  const habitTitle = props.habitTitle || 'Sessão Pomodoro';
  const remainingFormatted = props.remainingFormatted || '25:00';
  const safeProgress =
    typeof props.progress === 'number' ? Math.max(0, Math.min(1, props.progress)) : 0;

  const startDate = new Date(
    typeof props.startTimestampMs === 'number' ? props.startTimestampMs : Date.now()
  );
  const endDate = new Date(
    typeof props.endTimestampMs === 'number'
      ? Math.max(props.endTimestampMs, startDate.getTime() + 1000)
      : Date.now() + 25 * 60 * 1000
  );
  const timerRange = { lower: startDate, upper: endDate };
  const statusSymbol = !isRunning ? 'pause.fill' : isBreak ? 'leaf.fill' : 'timer';
  const toggleTarget = isRunning ? 'focus_pause' : 'focus_resume';
  const toggleLabel = isRunning ? 'Pausar' : 'Retomar';
  const toggleIcon = isRunning ? 'pause.fill' : 'play.fill';

  return {
    // 1. Dynamic Island — Compact Leading (ícone do modo em destaque)
    compactLeading: (
      <HStack alignment="center" spacing={4}>
        <Image
          systemName={statusSymbol}
          size={13}
          color={accent}
        />
      </HStack>
    ),

    // 2. Dynamic Island — Compact Trailing (contagem regressiva nativa em tempo real)
    compactTrailing: isRunning ? (
      <Text
        timerInterval={timerRange}
        countsDown={true}
        modifiers={[
          font({ size: 13, weight: 'bold', design: 'monospaced' }),
          foregroundStyle(accent),
          frame({ maxWidth: 52, alignment: 'trailing' }),
          lineLimit(1),
        ]}
      />
    ) : (
      <Text
        modifiers={[
          font({ size: 13, weight: 'bold', design: 'monospaced' }),
          foregroundStyle('#94A3B8'),
          lineLimit(1),
        ]}>
        {remainingFormatted}
      </Text>
    ),

    // 3. Dynamic Island — Minimal (quando outra atividade também está na ilha)
    minimal: (
      <Image
        systemName={statusSymbol}
        size={13}
        color={accent}
      />
    ),

    // 4. Dynamic Island — Expanded Leading
    expandedLeading: (
      <HStack alignment="center" spacing={5} modifiers={[padding({ leading: 4 })]}>
        <Image systemName={statusSymbol} size={15} color={accent} />
        <Text
          modifiers={[
            font({ size: 12, weight: 'bold' }),
            foregroundStyle(accent),
            lineLimit(1),
          ]}>
          {modeLabel}
        </Text>
      </HStack>
    ),

    // 5. Dynamic Island — Expanded Trailing (contagem regressiva grande)
    expandedTrailing: isRunning ? (
      <Text
        timerInterval={timerRange}
        countsDown={true}
        modifiers={[
          font({ size: 20, weight: 'heavy', design: 'monospaced' }),
          foregroundStyle('#FFFFFF'),
          padding({ trailing: 4 }),
          lineLimit(1),
        ]}
      />
    ) : (
      <Text
        modifiers={[
          font({ size: 20, weight: 'heavy', design: 'monospaced' }),
          foregroundStyle('#94A3B8'),
          padding({ trailing: 4 }),
          lineLimit(1),
        ]}>
        {remainingFormatted}
      </Text>
    ),

    // 6. Dynamic Island — Expanded Center (hábito vinculado)
    expandedCenter: (
      <Text
        modifiers={[
          font({ size: 13, weight: 'semibold' }),
          foregroundStyle('#E2E8F0'),
          lineLimit(1),
        ]}>
        {habitTitle}
      </Text>
    ),

    // 7. Dynamic Island — Expanded Bottom (barra de progresso + botões Pausar/Pular)
    expandedBottom: (
      <VStack spacing={8} modifiers={[padding({ horizontal: 4, bottom: 4 })]}>
        {isRunning ? (
          <ProgressView
            timerInterval={timerRange}
            countsDown={false}
            modifiers={[tint(accent)]}
          />
        ) : (
          <ProgressView value={safeProgress} modifiers={[tint('#64748B')]} />
        )}

        <HStack spacing={8}>
          <Button
            target={toggleTarget}
            modifiers={[
              buttonStyle('plain'),
              padding({ horizontal: 12, vertical: 6 }),
              background(accent, shapes.capsule()),
            ]}>
            <HStack spacing={4}>
              <Image systemName={toggleIcon} size={11} color="#0F172A" />
              <Text
                modifiers={[
                  font({ size: 12, weight: 'bold' }),
                  foregroundStyle('#0F172A'),
                ]}>
                {toggleLabel}
              </Text>
            </HStack>
          </Button>

          <Button
            target="focus_skip"
            modifiers={[
              buttonStyle('plain'),
              padding({ horizontal: 12, vertical: 6 }),
              background(btnBg, shapes.capsule()),
            ]}>
            <HStack spacing={4}>
              <Image systemName="forward.end.fill" size={11} color="#F8FAFC" />
              <Text
                modifiers={[
                  font({ size: 12, weight: 'semibold' }),
                  foregroundStyle('#F8FAFC'),
                ]}>
                Pular
              </Text>
            </HStack>
          </Button>

          <Spacer />
        </HStack>
      </VStack>
    ),

    // 8. Lock Screen Card (Banner estilizado Momentus com controles interativos)
    banner: (
      <VStack
        alignment="leading"
        spacing={10}
        modifiers={[
          padding({ all: 16 }),
          background(cardBg, shapes.roundedRectangle({ cornerRadius: 20 })),
        ]}>
        {/* Cabeçalho: Modo + Contagem Regressiva */}
        <HStack alignment="center">
          <HStack alignment="center" spacing={6}>
            <Image systemName={statusSymbol} size={16} color={accent} />
            <VStack alignment="leading" spacing={1}>
              <Text
                modifiers={[
                  font({ size: 11, weight: 'bold' }),
                  foregroundStyle(accent),
                  lineLimit(1),
                ]}>
                {isRunning ? modeLabel.toUpperCase() : `${modeLabel.toUpperCase()} • PAUSADO`}
              </Text>
              <Text
                modifiers={[
                  font({ size: 14, weight: 'bold' }),
                  foregroundStyle('#FFFFFF'),
                  lineLimit(1),
                ]}>
                {habitTitle}
              </Text>
            </VStack>
          </HStack>

          <Spacer />

          {isRunning ? (
            <Text
              timerInterval={timerRange}
              countsDown={true}
              modifiers={[
                font({ size: 26, weight: 'heavy', design: 'monospaced' }),
                foregroundStyle('#FFFFFF'),
                lineLimit(1),
              ]}
            />
          ) : (
            <Text
              modifiers={[
                font({ size: 26, weight: 'heavy', design: 'monospaced' }),
                foregroundStyle('#94A3B8'),
                lineLimit(1),
              ]}>
              {remainingFormatted}
            </Text>
          )}
        </HStack>

        {/* Barra de Progresso ao Vivo */}
        {isRunning ? (
          <ProgressView
            timerInterval={timerRange}
            countsDown={false}
            modifiers={[tint(accent)]}
          />
        ) : (
          <ProgressView value={safeProgress} modifiers={[tint('#64748B')]} />
        )}

        {/* Controles Interativos na Tela de Bloqueio */}
        <HStack spacing={8}>
          <Button
            target={toggleTarget}
            modifiers={[
              buttonStyle('plain'),
              padding({ horizontal: 14, vertical: 7 }),
              background(accent, shapes.capsule()),
            ]}>
            <HStack spacing={5}>
              <Image systemName={toggleIcon} size={12} color="#0F172A" />
              <Text
                modifiers={[
                  font({ size: 12, weight: 'bold' }),
                  foregroundStyle('#0F172A'),
                ]}>
                {toggleLabel}
              </Text>
            </HStack>
          </Button>

          <Button
            target="focus_skip"
            modifiers={[
              buttonStyle('plain'),
              padding({ horizontal: 14, vertical: 7 }),
              background(btnBg, shapes.capsule()),
            ]}>
            <HStack spacing={5}>
              <Image systemName="forward.end.fill" size={12} color="#F8FAFC" />
              <Text
                modifiers={[
                  font({ size: 12, weight: 'semibold' }),
                  foregroundStyle('#F8FAFC'),
                ]}>
                Pular ciclo
              </Text>
            </HStack>
          </Button>

          <Spacer />

          <Text
            modifiers={[
              font({ size: 11, weight: 'semibold' }),
              foregroundStyle('#64748B'),
            ]}>
            Momentus
          </Text>
        </HStack>
      </VStack>
    ),
  };
};

let cachedFactory: LiveActivityFactory<FocusLiveActivityProps> | null = null;

/**
 * Inicializa a Live Activity de Foco do iOS de forma lazy e segura
 * (no-op em Web, Android e Expo Go sem módulo nativo).
 */
export function getMomentusFocusLiveActivity(): LiveActivityFactory<FocusLiveActivityProps> | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  if (cachedFactory) {
    return cachedFactory;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createLiveActivity } = require('expo-widgets') as typeof import('expo-widgets');
    cachedFactory = createLiveActivity<FocusLiveActivityProps>(
      MOMENTUS_FOCUS_LIVE_ACTIVITY_NAME,
      MomentusFocusLiveActivityLayout
    );
    return cachedFactory;
  } catch {
    return null;
  }
}
