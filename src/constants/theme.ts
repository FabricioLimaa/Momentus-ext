import '@/global.css';
import { Platform, useWindowDimensions } from 'react-native';

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

/**
 * Escala Base Linear - Grade de 8 Pontos (8pt Grid System)
 */
export const Space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 64,
} as const;

/**
 * Tokens Semânticos e Responsivos de Layout (Phone vs Tablet)
 */
export const Layout = {
  page: { phone: Space[4], tablet: Space[5] }, // 16px -> 24px
  cardGap: { phone: Space[4], tablet: Space[5] }, // 16px -> 24px
  section: { phone: Space[6], tablet: Space[8] }, // 32px -> 48px
  field: Space[2], // label <-> input = 8px
  fieldGroup: Space[5], // entre grupos de campos = 24px
  inline: Space[2], // ícone <-> texto / botão <-> botão = 8px
} as const;

/**
 * Escala Canônica de Tamanhos de Ícone (Ionicons / Vetores)
 */
export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  hero: 48,
  illustration: 64,
} as const;

/**
 * Helper de Acessibilidade para Área de Toque Mínima (Apple HIG 44pt / Google Material 48dp)
 */
export const HitSlop = {
  toTarget: (visualSize: number, targetSize: number = 48) => {
    const diff = Math.max(0, Math.round((targetSize - visualSize) / 2));
    return { top: diff, bottom: diff, left: diff, right: diff };
  },
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;

/**
 * Hook responsivo para consumo dinâmico dos tokens de layout
 */
export function useLayoutTokens() {
  const { width } = useWindowDimensions();
  const isTablet = width > 680;
  return {
    isTablet,
    pagePadding: isTablet ? Layout.page.tablet : Layout.page.phone,
    cardGap: isTablet ? Layout.cardGap.tablet : Layout.cardGap.phone,
    sectionSpacing: isTablet ? Layout.section.tablet : Layout.section.phone,
  };
}

export const BottomTabInset = Platform.select({ ios: 104, android: 96 }) ?? 80;
/** @deprecated Utilize LayoutTokens.maxContentWidth (680) */
export const MaxContentWidth = 680;
/** @deprecated Utilize SpacingTokens ou Space */
export const Spacing = Space;

/**
 * Design Tokens Oficiais do Momentus (Multiplataforma: Web, Android e iOS)
 */
export const LayoutTokens = {
  /** Largura máxima padrão para telas de conteúdo (Home, Agenda, Stats, Menu, etc.) */
  maxContentWidth: 680,
  /** Largura máxima para fluxos focados / leitura imersiva (Modo Foco) - 68 * 8 */
  maxFocusWidth: 544,
  /** Largura máxima para autenticação e formulários estreitos (Login, Cadastro, Recuperar Senha) - 55 * 8 */
  maxAuthWidth: 440,
  /** Largura máxima para diálogos flutuantes centrais (Modais informativos e de confirmação) - 52 * 8 */
  maxDialogWidth: 416,
  /** Largura máxima para formulários modais e bottom sheets no desktop - 65 * 8 */
  maxModalSheetWidth: 520,
  /** Padding horizontal padrão do aplicativo em smartphones (Grid 8pt: 2 * 8) */
  pagePaddingHorizontal: 16,
  /** Padding vertical padrão de topo do conteúdo (Grid 8pt: 2 * 8) */
  pagePaddingTop: 16,
  /** Espaçamento de rodapé para garantir que o FAB ou barra inferior não cubram conteúdo (Multiplos de 8) */
  pagePaddingBottom: Platform.select({ ios: 104, android: 96, default: 80 }) ?? 80,
} as const;

/**
 * Escala Canônica de Espaçamentos - Grade de 8 Pontos (8pt Grid System)
 * Proporção e contraste baseados nas leis da Gestalt de Proximidade
 */
export const SpacingTokens = {
  /** 4px: Meio passo óptico para micro-alinhamentos (ícone + texto, badges, chips) */
  xs: 4,
  /** 8px: Relação íntima entre elementos correlacionados (label e input, título e subtítulo) */
  sm: 8,
  /** 16px: Distância padrão entre cards irmãos e padding interno padrão */
  md: 16,
  /** 24px: Separação entre grupos funcionais, padding de containers maiores e modais */
  lg: 24,
  /** 32px: Distância entre blocos maiores e seções de página */
  xl: 32,
  /** 40px: Respiro amplo entre grandes grupos */
  xxl: 40,
  /** 48px: Separação entre grandes áreas funcionais, touch target mínimo de acessibilidade */
  '2xl': 48,
  /** 64px: Respiro visual profundo e padding de final de página */
  '3xl': 64,
  /** 32px: Espaçamento canônico entre seções */
  section: 32,
} as const;

/**
 * Escala de Raios de Borda Harmônicos com o Grid de 8 Pontos
 */
export const BorderRadiusTokens = {
  xs: 4,
  sm: 8,
  control: 12,
  input: 16,
  button: 16,
  card: 16,
  cardHero: 24,
  modal: 24,
  modalLarge: 32,
  pill: 9999,
} as const;

/**
 * Alturas de Componentes Canônicas (Múltiplos de 8)
 * Atende 100% dos requisitos de ergonomia e acessibilidade (Apple HIG / Google Material)
 */
export const ComponentHeightTokens = {
  /** 56px: Botões de Ação Primária / Hero CTA (7 * 8) */
  buttonHero: 56,
  /** 48px: Botões secundários e modais (6 * 8) */
  buttonModal: 48,
  /** 40px: Botões compactos de ação rápida (5 * 8) */
  buttonCompact: 40,
  /** 48px: Altura padrão de inputs compactos (6 * 8) */
  input: 48,
  /** 56px: Altura de inputs proeminentes (Auth / Login) (7 * 8) */
  inputHero: 56,
  /** 48px: Contêiner de toque mínimo para botões de ícone (WCAG 48x48) */
  iconButton: 48,
  /** 32px: Chips e pílulas compactas (4 * 8) */
  chip: 32,
  /** 40px: Chips e pílulas regulares (5 * 8) */
  chipLarge: 40,
  /** 56px: Botão de Ação Flutuante (FAB) (7 * 8) */
  fab: 56,
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

