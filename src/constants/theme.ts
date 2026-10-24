import '@/global.css';
import { Platform } from 'react-native';

export const MomentusColors = {
  navyBackground: '#0F172A',
  navySurface: '#1E293B',
  navyCard: '#1E293B',
  navyCardElevated: '#283548',
  navyOutline: '#334155',
  emeraldNeon: '#34D399',
  emeraldGreen: '#10B981',
  emeraldDeep: '#059669',
  emeraldLight: '#D1FAE5',
  fireStreak: '#F59E0B',
  fireGlow: '#EF4444',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  glassBackground: 'rgba(30, 41, 59, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassCard: 'rgba(30, 41, 59, 0.65)',
  error: '#EF4444',
  errorRed: '#EF4444',
  dangerRed: '#EF4444',
  emeraldDark: '#047857',
  gold: '#FBBF24',
  cyan: '#38BDF8',
};

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
    tint: MomentusColors.emeraldGreen,
  },
  dark: {
    text: MomentusColors.textPrimary,
    background: MomentusColors.navyBackground,
    backgroundElement: MomentusColors.navySurface,
    backgroundSelected: '#2B394E',
    textSecondary: MomentusColors.textSecondary,
    tint: MomentusColors.emeraldNeon,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export function getContrastTextColor(hexColor?: string | null): string {
  if (!hexColor) return '#0F172A';
  try {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? '#0F172A' : '#FFFFFF';
  } catch {
    return '#0F172A';
  }
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 70 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Design Tokens Oficiais do Momentus (Multiplataforma: Web, Android e iOS)
 */
export const LayoutTokens = {
  /** Largura máxima padrão para telas de conteúdo (Home, Agenda, Stats, Menu, etc.) */
  maxContentWidth: 680,
  /** Largura máxima para fluxos focados / leitura imersiva (Modo Foco) */
  maxFocusWidth: 540,
  /** Largura máxima para autenticação e formulários estreitos (Login, Cadastro, Recuperar Senha) */
  maxAuthWidth: 440,
  /** Largura máxima para diálogos flutuantes centrais (Modais informativos e de confirmação) */
  maxDialogWidth: 420,
  /** Largura máxima para formulários modais e bottom sheets no desktop */
  maxModalSheetWidth: 520,
  /** Padding horizontal padrão do aplicativo em smartphones */
  pagePaddingHorizontal: 20,
  /** Padding vertical padrão de topo do conteúdo */
  pagePaddingTop: 16,
  /** Espaçamento de rodapé para garantir que o FAB ou barra inferior não cubram conteúdo */
  pagePaddingBottom: Platform.select({ ios: 100, android: 96, default: 80 }) ?? 80,
} as const;

export const SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
} as const;

export const BorderRadiusTokens = {
  xs: 6,
  sm: 10,
  control: 12,
  input: 16,
  button: 16,
  card: 20,
  modal: 28,
  pill: 9999,
} as const;

export const ComponentHeightTokens = {
  buttonHero: 52,
  buttonModal: 48,
  input: 52,
  iconButton: 44,
  chip: 38,
  fab: 58,
} as const;

export const TypographyTokens = {
  heroTitle: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800' as const,
    lineHeight: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  micro: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
} as const;

