import Svg, { Circle, Defs, Ellipse, Path } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, sparklePath, useSvgIds, type IllustrationProps } from './shared';

/** Constellation of AI sparkles — "AI is generating". */
export function SparklesIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'big', 'gold', 'sky'] as const);
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#8B5CF6" opacity={dark ? 0.5 : 0.45} />
        <Linear id={ids.big.id} stops={['#818CF8', '#6366F1', '#9333EA']} />
        <Linear id={ids.gold.id} stops={PALETTE.gold.slice(0, 2)} />
        <Linear id={ids.sky.id} stops={PALETTE.sky} />
      </Defs>
      <Circle cx={100} cy={100} r={96} fill={ids.glow.url} />
      <Ellipse
        cx={100}
        cy={104}
        rx={84}
        ry={34}
        stroke={dark ? '#6366F1' : '#A5B4FC'}
        strokeWidth={2}
        strokeDasharray="4 8"
        fill="none"
        transform="rotate(-18 100 104)"
      />
      <Path d={sparklePath(100, 100, 56)} fill={ids.big.url} />
      <Path d={sparklePath(92, 86, 14)} fill="#FFFFFF" opacity={0.35} />
      <Path d={sparklePath(154, 52, 18)} fill={ids.gold.url} />
      <Path d={sparklePath(50, 150, 13)} fill={ids.sky.url} />
      <Path d={sparklePath(160, 150, 7)} fill="#F472B6" />
      <Circle cx={22} cy={92} r={4} fill="#A78BFA" />
      <Circle cx={182} cy={108} r={3.5} fill="#38BDF8" />
      <Circle cx={56} cy={46} r={3} fill="#FBBF24" />
    </Svg>
  );
}
