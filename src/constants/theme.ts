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
