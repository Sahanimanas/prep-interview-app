import Svg, { Circle, Defs, G, Path, Polygon } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, useSvgIds, type IllustrationProps } from './shared';

/** Folded map with a dashed route and a compass — the prep plan. */
export function CompassIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'pin', 'ring'] as const);
  const panelA = dark ? '#312E81' : '#E0E7FF';
  const panelB = dark ? '#3730A3' : '#EEF2FF';
  const land = dark ? '#065F46' : '#BBF7D0';
  const face = dark ? '#F8FAFC' : '#FFFFFF';

  return (
    <Svg width={size} height={size * (180 / 220)} viewBox="0 0 220 180" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#38BDF8" opacity={dark ? 0.3 : 0.4} />
        <Linear id={ids.pin.id} stops={PALETTE.rose} />
        <Linear id={ids.ring.id} stops={PALETTE.brand} />
      </Defs>
      <Circle cx={110} cy={90} r={88} fill={ids.glow.url} />

      {/* map */}
      <G>
        <Polygon points="40,40 90,26 90,146 40,160" fill={panelA} />
        <Polygon points="90,26 140,40 140,160 90,146" fill={panelB} />
        <Polygon points="140,40 190,26 190,146 140,160" fill={panelA} />
        <Path d="M48 70 C 60 60, 78 66, 84 78 C 88 88, 74 96, 62 92 C 52 88, 44 80, 48 70 Z" fill={land} opacity={0.9} />
        <Path d="M150 104 C 162 96, 180 100, 182 114 C 184 126, 166 132, 156 126 C 148 120, 144 110, 150 104 Z" fill={land} opacity={0.9} />
        <Path
          d="M58 132 C 80 120, 92 92, 112 96 C 134 100, 132 70, 166 62"
          stroke="#6366F1"
          strokeWidth={3.5}
          strokeDasharray="7 7"
          strokeLinecap="round"
          fill="none"
        />
        {/* destination pin */}
        <Path d="M166 34 C 176 34, 182 42, 182 50 C 182 62, 166 74, 166 74 C 166 74, 150 62, 150 50 C 150 42, 156 34, 166 34 Z" fill={ids.pin.url} />
        <Circle cx={166} cy={50} r={5.5} fill="#FFFFFF" />
        <Circle cx={58} cy={132} r={6} fill="#6366F1" stroke="#FFFFFF" strokeWidth={2.5} />
      </G>

      {/* compass */}
      <G>
        <Circle cx={62} cy={132} r={30} fill={ids.ring.url} />
        <Circle cx={62} cy={132} r={24} fill={face} />
        {[0, 90, 180, 270].map((deg) => (
          <Path
            key={deg}
            d="M62 111 L62 115"
            stroke="#94A3B8"
            strokeWidth={2}
            strokeLinecap="round"
            transform={`rotate(${deg} 62 132)`}
          />
        ))}
        <G transform="rotate(30 62 132)">
          <Polygon points="62,112 67,132 57,132" fill="#EF4444" />
          <Polygon points="62,152 67,132 57,132" fill="#475569" />
        </G>
        <Circle cx={62} cy={132} r={3} fill="#1E293B" />
      </G>
    </Svg>
  );
}
