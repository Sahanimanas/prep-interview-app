/**
 * PrepPilot design tokens (light + dark).
 * Brand: indigo primary, emerald success, amber warning, red danger, slate neutrals.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F8FAFC', // slate-50
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9', // slate-100
    surfaceElevated: '#FFFFFF',
    border: '#E2E8F0', // slate-200
    borderStrong: '#CBD5E1', // slate-300
    text: '#0F172A', // slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#94A3B8', // slate-400
    primary: '#4F46E5', // indigo-600
    primaryPressed: '#4338CA', // indigo-700
    primaryMuted: '#EEF2FF', // indigo-50
    primaryBorder: '#C7D2FE', // indigo-200
    onPrimary: '#FFFFFF',
    success: '#059669', // emerald-600
    successMuted: '#ECFDF5',
    successBorder: '#A7F3D0',
    warning: '#D97706', // amber-600
    warningMuted: '#FFFBEB',
    warningBorder: '#FDE68A',
    danger: '#DC2626', // red-600
    dangerMuted: '#FEF2F2',
    dangerBorder: '#FECACA',
    codeBackground: '#0F172A',
    codeText: '#E2E8F0',
    skeleton: '#E2E8F0',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
  dark: {
    background: '#020617', // slate-950
    surface: '#0F172A', // slate-900
    surfaceMuted: '#1E293B', // slate-800
    surfaceElevated: '#1E293B',
    border: '#1E293B',
    borderStrong: '#334155', // slate-700
    text: '#F1F5F9', // slate-100
    textSecondary: '#CBD5E1', // slate-300
    textMuted: '#64748B', // slate-500
    primary: '#818CF8', // indigo-400
    primaryPressed: '#6366F1', // indigo-500
    primaryMuted: '#1E1B4B', // indigo-950
    primaryBorder: '#3730A3', // indigo-800
    onPrimary: '#0B1020',
    success: '#34D399', // emerald-400
    successMuted: '#022C22',
    successBorder: '#065F46',
    warning: '#FBBF24', // amber-400
    warningMuted: '#2A1A03',
    warningBorder: '#92400E',
    danger: '#F87171', // red-400
    dangerMuted: '#2A0A0A',
    dangerBorder: '#991B1B',
    codeBackground: '#020617',
    codeText: '#E2E8F0',
    skeleton: '#1E293B',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

/** Semantic tones shared by Badge, Callout, Chip, etc. */
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export function toneColors(colors: ThemeColors, tone: Tone): { fg: string; bg: string; border: string } {
  switch (tone) {
    case 'primary':
      return { fg: colors.primary, bg: colors.primaryMuted, border: colors.primaryBorder };
    case 'success':
      return { fg: colors.success, bg: colors.successMuted, border: colors.successBorder };
    case 'warning':
      return { fg: colors.warning, bg: colors.warningMuted, border: colors.warningBorder };
    case 'danger':
      return { fg: colors.danger, bg: colors.dangerMuted, border: colors.dangerBorder };
    default:
      return { fg: colors.textSecondary, bg: colors.surfaceMuted, border: colors.border };
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

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Refined type scale (tight display sizes, comfortable reading sizes). */
export const Typography = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6 },
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  stat: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Readable single-column width on phones; wide layouts on tablets go up to MaxWideWidth. */
export const MaxContentWidth = 760;
export const MaxWideWidth = 1240;
/** Breakpoints for `useResponsive`. */
export const Breakpoints = { tablet: 768, desktop: 1100 } as const;

/** Gradient stops ([start, end] or more), used with expo-linear-gradient and SVG. */
export type GradientStops = readonly [string, string, ...string[]];

export const Gradients = {
  light: {
    brand: ['#4F46E5', '#7C3AED'],
    hero: ['#EEF2FF', '#F5F3FF', '#F8FAFC'],
    heroStrong: ['#4F46E5', '#6D28D9', '#9333EA'],
    success: ['#10B981', '#059669'],
    warm: ['#F59E0B', '#F43F5E'],
    ocean: ['#0EA5E9', '#4F46E5'],
    xp: ['#F59E0B', '#F97316'],
  },
  dark: {
    brand: ['#6366F1', '#8B5CF6'],
    hero: ['#1E1B4B', '#170F33', '#020617'],
    heroStrong: ['#4338CA', '#5B21B6', '#7E22CE'],
    success: ['#34D399', '#059669'],
    warm: ['#FBBF24', '#FB7185'],
    ocean: ['#38BDF8', '#6366F1'],
    xp: ['#FBBF24', '#FB923C'],
  },
} as const satisfies Record<ColorScheme, Record<string, GradientStops>>;

export type GradientName = keyof typeof Gradients.light;

/** Gradient pairs used for deterministic topic cover art. */
export const CoverPalettes: readonly (readonly [string, string])[] = [
  ['#4F46E5', '#9333EA'],
  ['#0EA5E9', '#6366F1'],
  ['#10B981', '#0EA5E9'],
  ['#F59E0B', '#EF4444'],
  ['#EC4899', '#8B5CF6'],
  ['#14B8A6', '#22C55E'],
  ['#F97316', '#DB2777'],
  ['#6366F1', '#06B6D4'],
  ['#8B5CF6', '#EC4899'],
  ['#0F766E', '#4F46E5'],
];

/** Consistent elevation. Dark mode relies more on borders than shadows. */
export function elevation(level: 0 | 1 | 2 | 3, scheme: ColorScheme) {
  if (level === 0) return {};
  const dark = scheme === 'dark';
  const presets = {
    1: { radius: 6, y: 2, opacity: dark ? 0.35 : 0.06, android: 1 },
    2: { radius: 14, y: 6, opacity: dark ? 0.45 : 0.09, android: 4 },
    3: { radius: 24, y: 12, opacity: dark ? 0.55 : 0.14, android: 10 },
  } as const;
  const p = presets[level];
  return {
    shadowColor: dark ? '#000000' : '#1E1B4B',
    shadowOpacity: p.opacity,
    shadowRadius: p.radius,
    shadowOffset: { width: 0, height: p.y },
    elevation: p.android,
  };
}
