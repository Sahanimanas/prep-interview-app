import Svg, { Circle, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, sparklePath, useSvgIds, type IllustrationProps } from './shared';

/** Stack of books with a lit bulb — empty states / "start learning". */
export function BooksIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'b1', 'b2', 'b3', 'bulb', 'shade'] as const);
  const page = dark ? '#E2E8F0' : '#FFFFFF';
  const base = dark ? '#475569' : '#94A3B8';

  return (
    <Svg width={size} height={size * (180 / 220)} viewBox="0 0 220 180" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#FBBF24" opacity={dark ? 0.3 : 0.4} />
        <Linear id={ids.b1.id} stops={PALETTE.indigo} x1="0" y1="0" x2="1" y2="0" />
        <Linear id={ids.b2.id} stops={PALETTE.mint} x1="0" y1="0" x2="1" y2="0" />
        <Linear id={ids.b3.id} stops={PALETTE.warm.slice(0, 2)} x1="0" y1="0" x2="1" y2="0" />
        <Linear id={ids.bulb.id} stops={['#FEF9C3', '#FDE047', '#F59E0B']} x1="0.3" y1="0" x2="0.7" y2="1" />
        <Linear id={ids.shade.id} stops={['#000000', '#000000']} />
      </Defs>

      <Circle cx={150} cy={50} r={52} fill={ids.glow.url} />
      <Ellipse cx={108} cy={166} rx={86} ry={8} fill={dark ? '#0F172A' : '#E2E8F0'} />

      {/* bottom book */}
      <G>
        <Rect x={28} y={128} width={150} height={32} rx={6} fill={ids.b1.url} />
        <Rect x={34} y={134} width={138} height={6} rx={3} fill={page} opacity={0.85} />
        <Rect x={44} y={146} width={40} height={4} rx={2} fill="#FFFFFF" opacity={0.5} />
      </G>
      {/* middle book */}
      <G transform="rotate(-4 105 112)">
        <Rect x={40} y={98} width={132} height={30} rx={6} fill={ids.b2.url} />
        <Rect x={46} y={104} width={120} height={5} rx={2.5} fill={page} opacity={0.85} />
        <Rect x={140} y={114} width={20} height={4} rx={2} fill="#FFFFFF" opacity={0.55} />
      </G>
      {/* top book */}
      <G transform="rotate(3 100 82)">
        <Rect x={34} y={70} width={124} height={28} rx={6} fill={ids.b3.url} />
        <Rect x={40} y={75} width={112} height={5} rx={2.5} fill={page} opacity={0.85} />
        <Line x1={56} y1={88} x2={96} y2={88} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
      </G>

      {/* bulb */}
      <G>
        {[[-40, 0], [-20, -30], [20, -30], [40, 0], [0, -42]].map(([dx, dy], i) => (
          <Line
            key={i}
            x1={150 + (dx ?? 0) * 0.62}
            y1={44 + (dy ?? 0) * 0.62}
            x2={150 + (dx ?? 0) * 0.85}
            y2={44 + (dy ?? 0) * 0.85}
            stroke="#F59E0B"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        ))}
        <Path d="M150 18 C 166 18, 176 30, 176 44 C 176 56, 166 62, 163 72 L137 72 C 134 62, 124 56, 124 44 C 124 30, 134 18, 150 18 Z" fill={ids.bulb.url} />
        <Path d="M144 70 L144 56 Q150 48 156 56 L156 70" stroke="#B45309" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Ellipse cx={140} cy={34} rx={5} ry={8} fill="#FFFFFF" opacity={0.6} />
        <Rect x={138} y={72} width={24} height={7} rx={2.5} fill={base} />
        <Rect x={140} y={80} width={20} height={6} rx={2.5} fill={base} opacity={0.8} />
      </G>

      <Path d={sparklePath(30, 40, 8)} fill="#818CF8" />
      <Path d={sparklePath(196, 112, 6)} fill="#34D399" />
      <Circle cx={60} cy={30} r={2.5} fill="#FBBF24" />
    </Svg>
  );
}
