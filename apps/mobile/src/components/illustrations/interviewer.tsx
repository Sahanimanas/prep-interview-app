import Svg, { Circle, Defs, G, Path, Polygon, Rect } from 'react-native-svg';

import { useColorSchemeName } from '@/hooks/use-theme';

import { Glow, Linear, PALETTE, sparklePath, starPoints, useSvgIds, type IllustrationProps } from './shared';

/** AI interviewer avatar with chat bubbles and a score chip — mock interviews. */
export function InterviewerIllustration({ size = 200, style }: IllustrationProps) {
  const dark = useColorSchemeName() === 'dark';
  const ids = useSvgIds(['glow', 'avatar', 'reply', 'chip'] as const);
  const bubble = dark ? '#1E293B' : '#FFFFFF';
  const bubbleStroke = dark ? '#334155' : '#E2E8F0';

  return (
    <Svg width={size} height={size * (180 / 220)} viewBox="0 0 220 180" style={style}>
      <Defs>
        <Glow id={ids.glow.id} color="#6366F1" opacity={dark ? 0.45 : 0.4} />
        <Linear id={ids.avatar.id} stops={PALETTE.brand} />
        <Linear id={ids.reply.id} stops={PALETTE.sky} />
        <Linear id={ids.chip.id} stops={PALETTE.mint} x1="0" y1="0" x2="1" y2="0" />
      </Defs>
      <Circle cx={110} cy={92} r={88} fill={ids.glow.url} />

      {/* avatar */}
      <G>
        <Circle cx={60} cy={112} r={44} fill={ids.avatar.url} />
        <Circle cx={60} cy={98} r={16} fill="#FFFFFF" opacity={0.95} />
        <Path d="M30 146 C 34 124, 86 124, 90 146 C 82 154, 38 154, 30 146 Z" fill="#FFFFFF" opacity={0.95} />
        <Path d={sparklePath(92, 74, 9)} fill="#FBBF24" />
      </G>

      {/* interviewer bubble */}
      <G>
        <Rect x={104} y={20} width={100} height={48} rx={18} fill={bubble} stroke={bubbleStroke} strokeWidth={1.5} />
        <Path d="M112 62 L100 78 L124 66 Z" fill={bubble} />
        <Circle cx={134} cy={44} r={5} fill="#6366F1" />
        <Circle cx={154} cy={44} r={5} fill="#8B5CF6" />
        <Circle cx={174} cy={44} r={5} fill="#A78BFA" />
      </G>

      {/* candidate bubble */}
      <G>
        <Rect x={116} y={84} width={92} height={42} rx={16} fill={ids.reply.url} />
        <Path d="M196 120 L210 134 L186 124 Z" fill="#6366F1" />
        <Rect x={130} y={97} width={58} height={5} rx={2.5} fill="#FFFFFF" opacity={0.9} />
        <Rect x={130} y={109} width={40} height={5} rx={2.5} fill="#FFFFFF" opacity={0.7} />
      </G>

      {/* score chip */}
      <G>
        <Rect x={124} y={140} width={66} height={26} rx={13} fill={ids.chip.url} />
        <Polygon points={starPoints(140, 153, 7)} fill="#FFFFFF" />
        <Rect x={152} y={149} width={28} height={8} rx={4} fill="#FFFFFF" opacity={0.9} />
      </G>
    </Svg>
  );
}
