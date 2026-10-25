import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient, RadialGradient, Stop } from 'react-native-svg';

export interface IllustrationProps {
  /** Rendered width; height follows the artwork's aspect ratio. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Unique, SVG-safe gradient ids per component instance (ids are global on web). */
export function useSvgIds<K extends string>(keys: readonly K[]): Record<K, { id: string; url: string }> {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const out = {} as Record<K, { id: string; url: string }>;
  for (const key of keys) out[key] = { id: `${key}${base}`, url: `url(#${key}${base})` };
  return out;
}

export function Linear({
  id,
  stops,
  x1 = '0',
  y1 = '0',
  x2 = '1',
  y2 = '1',
}: {
  id: string;
  stops: readonly string[];
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
}) {
  return (
    <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map((c, i) => (
        <Stop key={`${c}${i}`} offset={i / Math.max(1, stops.length - 1)} stopColor={c} />
      ))}
    </LinearGradient>
  );
}

/** Soft radial glow used as a backdrop behind every illustration. */
export function Glow({ id, color, opacity = 0.35 }: { id: string; color: string; opacity?: number }) {
  return (
    <RadialGradient id={id} cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor={color} stopOpacity={opacity} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

/** Curved four-point "AI sparkle" star. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.18;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/** Classic five-point star polygon points. */
export function starPoints(cx: number, cy: number, outer: number, inner = outer * 0.45): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export const PALETTE = {
  indigo: ['#6366F1', '#4F46E5'],
  violet: ['#8B5CF6', '#6D28D9'],
  brand: ['#6366F1', '#8B5CF6'],
  gold: ['#FDE68A', '#F59E0B', '#D97706'],
  warm: ['#FBBF24', '#F97316', '#EF4444'],
  mint: ['#34D399', '#059669'],
  sky: ['#38BDF8', '#6366F1'],
  rose: ['#FB7185', '#E11D48'],
} as const;
