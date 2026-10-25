import Svg, { Circle, Defs, G, Path, Polygon, Rect } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, sparklePath, starPoints, useSvgIds, type IllustrationProps } from './shared';

const CONFETTI: [number, number, number, string][] = [
  [30, 50, 20, '#6366F1'],
  [168, 40, -25, '#EC4899'],
  [180, 120, 40, '#10B981'],
  [22, 132, -35, '#0EA5E9'],
  [150, 18, 10, '#F59E0B'],
  [52, 22, 60, '#8B5CF6'],
];

/** Gold trophy with rays and confetti — scorecards and great results. */
export function TrophyIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'gold', 'base', 'plinth'] as const);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#F59E0B" opacity={dark ? 0.4 : 0.45} />
        <Linear id={ids.gold.id} stops={PALETTE.gold} x1="0" y1="0" x2="1" y2="1" />
        <Linear id={ids.base.id} stops={PALETTE.brand} />
        <Linear id={ids.plinth.id} stops={['#4338CA', '#312E81']} />
      </Defs>
      <Circle cx={100} cy={96} r={94} fill={ids.glow.url} />

      {/* rays */}
      <G opacity={dark ? 0.35 : 0.28}>
        {Array.from({ length: 12 }, (_, i) => (
          <Polygon key={i} points="100,84 94,6 106,6" fill="#F59E0B" transform={`rotate(${i * 30} 100 84)`} />
        ))}
      </G>

      {/* handles */}
      <Path d="M68 52 C 38 50, 38 94, 74 96" stroke={ids.gold.url} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d="M132 52 C 162 50, 162 94, 126 96" stroke={ids.gold.url} strokeWidth={10} fill="none" strokeLinecap="round" />
      {/* cup */}
      <Path d="M62 38 H138 V78 C 138 106, 120 124, 100 124 C 80 124, 62 106, 62 78 Z" fill={ids.gold.url} />
      <Path d="M72 46 C 72 80, 76 100, 90 114 C 76 108, 68 92, 68 70 Z" fill="#FFFFFF" opacity={0.35} />
      <Polygon points={starPoints(100, 76, 16)} fill="#FFFFFF" opacity={0.92} />
      {/* stem + base */}
      <Rect x={91} y={122} width={18} height={22} fill="#D97706" />
      <Rect x={72} y={142} width={56} height={14} rx={4} fill={ids.base.url} />
      <Rect x={60} y={156} width={80} height={18} rx={6} fill={ids.plinth.url} />
      <Rect x={84} y={161} width={32} height={6} rx={3} fill="#FDE68A" opacity={0.85} />

      {CONFETTI.map(([x, y, r, c]) => (
        <Rect key={`${x}-${y}`} x={x} y={y} width={10} height={5} rx={1.5} fill={c} transform={`rotate(${r} ${x + 5} ${y + 2})`} />
      ))}
      <Path d={sparklePath(160, 80, 9)} fill="#FBBF24" />
      <Path d={sparklePath(40, 96, 6)} fill="#A78BFA" />
    </Svg>
  );
}
