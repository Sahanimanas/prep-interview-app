import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import { CoverPalettes } from '@/constants/theme';
import { hashString, seededRandom } from '@/lib/seed';

import { TechLogo } from './tech-logo';

const VB_W = 400;
const VB_H = 200;

type PatternKind = 'orbs' | 'shards' | 'dots' | 'waves' | 'rings';
const PATTERNS: PatternKind[] = ['orbs', 'shards', 'dots', 'waves', 'rings'];

function Pattern({ kind, rand }: { kind: PatternKind; rand: () => number }) {
  switch (kind) {
    case 'orbs':
      return (
        <G>
          {Array.from({ length: 6 }, (_, i) => (
            <Circle
              key={i}
              cx={rand() * VB_W}
              cy={rand() * VB_H}
              r={30 + rand() * 90}
              fill="#FFFFFF"
              opacity={0.06 + rand() * 0.12}
            />
          ))}
        </G>
      );
    case 'shards':
      return (
        <G>
          {Array.from({ length: 7 }, (_, i) => {
            const x = rand() * VB_W;
            const y = rand() * VB_H;
            const s = 40 + rand() * 90;
            return (
              <Polygon
                key={i}
                points={`${x},${y} ${x + s},${y + s * 0.35} ${x + s * 0.3},${y + s}`}
                fill="#FFFFFF"
                opacity={0.06 + rand() * 0.14}
              />
            );
          })}
        </G>
      );
    case 'dots': {
      const gap = 22;
      const offset = rand() * gap;
      const dots: ReactNode[] = [];
      for (let x = offset; x < VB_W; x += gap) {
        for (let y = offset; y < VB_H; y += gap) {
          const fade = (x / VB_W) * 0.8 + 0.1;
          dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} fill="#FFFFFF" opacity={0.08 + fade * 0.22} />);
        }
      }
      return <G>{dots}</G>;
    }
    case 'waves':
      return (
        <G>
          {Array.from({ length: 5 }, (_, i) => {
            const y = 40 + i * 32 + rand() * 10;
            const amp = 14 + rand() * 18;
            return (
              <Path
                key={i}
                d={`M0 ${y} C ${VB_W * 0.25} ${y - amp}, ${VB_W * 0.5} ${y + amp}, ${VB_W * 0.75} ${y} S ${VB_W} ${y - amp}, ${VB_W + 20} ${y}`}
                stroke="#FFFFFF"
                strokeWidth={10 + rand() * 12}
                fill="none"
                opacity={0.07 + rand() * 0.1}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      );
    default: {
      const cx = VB_W * (0.6 + rand() * 0.3);
      const cy = VB_H * (0.2 + rand() * 0.5);
      return (
        <G>
          {Array.from({ length: 6 }, (_, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={24 + i * 28}
              stroke="#FFFFFF"
              strokeWidth={6}
              fill="none"
              opacity={0.16 - i * 0.02}
            />
          ))}
        </G>
      );
    }
  }
}

export interface TopicCoverProps {
  /** Stable seed — usually the topic id. */
  seed: string;
  technology?: string;
  height?: number;
  radius?: number;
  logoSize?: number;
  /** Content rendered over the art (e.g. a title). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Deterministic gradient + geometric pattern artwork, seeded by id, with the tech logo. */
export function TopicCover({ seed, technology, height = 120, radius = 16, logoSize = 36, children, style }: TopicCoverProps) {
  const hash = hashString(seed);
  const rand = seededRandom(hash);
  const palette = CoverPalettes[hash % CoverPalettes.length] ?? CoverPalettes[0] ?? ['#4F46E5', '#9333EA'];
  const kind = PATTERNS[(hash >>> 8) % PATTERNS.length] ?? 'orbs';
  const angle = rand();
  const gradientId = `cover${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={[{ height, borderRadius: radius }, styles.container, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1={angle > 0.5 ? '0' : '1'} x2="1" y2={angle > 0.5 ? '1' : '0'}>
            <Stop offset="0" stopColor={palette[0]} />
            <Stop offset="1" stopColor={palette[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VB_W} height={VB_H} fill={`url(#${gradientId})`} />
        <Pattern kind={kind} rand={rand} />
      </Svg>
      {technology ? <TechLogo technology={technology} size={logoSize} style={styles.logo} /> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  logo: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
});
