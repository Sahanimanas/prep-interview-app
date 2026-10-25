import Svg, { Circle, Defs, G, Line, Path, Polygon } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, sparklePath, useSvgIds, type IllustrationProps } from './shared';

/** Bullseye with an arrow — quizzes. */
export function TargetIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'ring', 'bull'] as const);
  const white = dark ? '#E2E8F0' : '#FFFFFF';

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#6366F1" opacity={dark ? 0.45 : 0.4} />
        <Linear id={ids.ring.id} stops={PALETTE.brand} />
        <Linear id={ids.bull.id} stops={PALETTE.warm.slice(1)} />
      </Defs>
      <Circle cx={96} cy={106} r={94} fill={ids.glow.url} />
      <Circle cx={96} cy={106} r={70} fill={ids.ring.url} />
      <Circle cx={96} cy={106} r={54} fill={white} />
      <Circle cx={96} cy={106} r={39} fill={ids.ring.url} />
      <Circle cx={96} cy={106} r={24} fill={white} />
      <Circle cx={96} cy={106} r={11} fill={ids.bull.url} />

      {/* arrow */}
      <G>
        <Line x1={172} y1={30} x2={102} y2={100} stroke={dark ? '#CBD5E1' : '#334155'} strokeWidth={5} strokeLinecap="round" />
        <Polygon points="98,104 104,88 114,98" fill={dark ? '#CBD5E1' : '#334155'} />
        <Polygon points="172,30 186,22 180,38" fill="#F59E0B" />
        <Polygon points="166,36 176,20 160,26" fill="#FBBF24" />
        <Polygon points="166,36 182,42 178,30" fill="#F97316" />
      </G>

      <Path d={sparklePath(132, 128, 8)} fill="#FBBF24" />
      <Path d={sparklePath(64, 70, 5)} fill="#FFFFFF" opacity={0.8} />
      <Path d={sparklePath(28, 40, 7)} fill="#34D399" />
    </Svg>
  );
}
