import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, sparklePath, useSvgIds, type IllustrationProps } from './shared';

/** Rocket lifting off — welcome / hero artwork. */
export function RocketIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'body', 'nose', 'fin', 'flame', 'core', 'glass'] as const);
  const cloud = dark ? '#1E293B' : '#E0E7FF';

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#818CF8" opacity={dark ? 0.45 : 0.55} />
        <Linear id={ids.body.id} stops={dark ? ['#F8FAFC', '#CBD5E1'] : ['#FFFFFF', '#E2E8F0']} x1="0" y1="0" x2="1" y2="0" />
        <Linear id={ids.nose.id} stops={PALETTE.brand} />
        <Linear id={ids.fin.id} stops={PALETTE.violet} />
        <Linear id={ids.flame.id} stops={PALETTE.warm} x1="0" y1="0" x2="0" y2="1" />
        <Linear id={ids.core.id} stops={['#FEF3C7', '#FBBF24']} x1="0" y1="0" x2="0" y2="1" />
        <Linear id={ids.glass.id} stops={PALETTE.sky} />
      </Defs>

      <Circle cx={100} cy={100} r={96} fill={ids.glow.url} />

      {/* stars */}
      <Path d={sparklePath(38, 48, 9)} fill="#FBBF24" />
      <Path d={sparklePath(168, 62, 6)} fill="#38BDF8" />
      <Path d={sparklePath(160, 158, 8)} fill="#A78BFA" />
      <Circle cx={62} cy={28} r={2.5} fill="#818CF8" />
      <Circle cx={178} cy={110} r={2} fill="#FBBF24" />
      <Circle cx={24} cy={120} r={2} fill="#38BDF8" />

      {/* clouds */}
      <G opacity={0.95}>
        <Ellipse cx={46} cy={176} rx={34} ry={14} fill={cloud} />
        <Circle cx={36} cy={166} r={14} fill={cloud} />
        <Circle cx={58} cy={162} r={18} fill={cloud} />
      </G>

      <G transform="rotate(38 100 100)">
        {/* flame */}
        <Path d="M100 146 C 84 166, 88 186, 100 198 C 112 186, 116 166, 100 146 Z" fill={ids.flame.url} />
        <Path d="M100 150 C 92 164, 94 176, 100 184 C 106 176, 108 164, 100 150 Z" fill={ids.core.url} />
        {/* fins */}
        <Path d="M80 112 L58 146 Q 70 146 82 140 Z" fill={ids.fin.url} />
        <Path d="M120 112 L142 146 Q 130 146 118 140 Z" fill={ids.fin.url} />
        {/* body */}
        <Path
          d="M100 24 C 126 46, 130 96, 121 142 L79 142 C 70 96, 74 46, 100 24 Z"
          fill={ids.body.url}
          stroke={dark ? '#94A3B8' : '#C7D2FE'}
          strokeWidth={1.5}
        />
        {/* nose */}
        <Path d="M100 24 C 112 34, 119 48, 121 60 L79 60 C 81 48, 88 34, 100 24 Z" fill={ids.nose.url} />
        {/* window */}
        <Circle cx={100} cy={88} r={16} fill="#FFFFFF" stroke="#6366F1" strokeWidth={5} />
        <Circle cx={100} cy={88} r={10} fill={ids.glass.url} />
        <Ellipse cx={96} cy={84} rx={4} ry={2.5} fill="#FFFFFF" opacity={0.75} />
        {/* center fin + rivets */}
        <Rect x={96} y={122} width={8} height={26} rx={4} fill={ids.fin.url} />
        <Circle cx={88} cy={116} r={2} fill="#A5B4FC" />
        <Circle cx={112} cy={116} r={2} fill="#A5B4FC" />
      </G>
    </Svg>
  );
}
