import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type PlatformNames = Exclude<SymbolViewProps['name'], string>;
type IosSymbol = NonNullable<PlatformNames['ios']>;
type MaterialSymbol = NonNullable<PlatformNames['android']>;

/** Semantic icon set: SF Symbols on iOS, Material Symbols on Android / web. */
const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  bookmark: { ios: 'bookmark', android: 'bookmark_border' },
  bookmarkFilled: { ios: 'bookmark.fill', android: 'bookmark' },
  add: { ios: 'plus', android: 'add' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  close: { ios: 'xmark', android: 'close' },
  closeCircle: { ios: 'xmark.circle.fill', android: 'cancel' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  chevronUp: { ios: 'chevron.up', android: 'expand_less' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  arrowLeft: { ios: 'arrow.left', android: 'arrow_back' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  clock: { ios: 'clock', android: 'schedule' },
  timer: { ios: 'timer', android: 'timer' },
  quiz: { ios: 'checklist', android: 'quiz' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum' },
  send: { ios: 'arrow.up.circle.fill', android: 'send' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
  replay: { ios: 'arrow.counterclockwise', android: 'replay' },
  trash: { ios: 'trash', android: 'delete' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  key: { ios: 'key.fill', android: 'key' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  error: { ios: 'exclamationmark.octagon.fill', android: 'error' },
  info: { ios: 'info.circle.fill', android: 'info' },
  lightbulb: { ios: 'lightbulb.fill', android: 'lightbulb' },
  book: { ios: 'book.fill', android: 'menu_book' },
  school: { ios: 'graduationcap.fill', android: 'school' },
  flag: { ios: 'flag.fill', android: 'flag' },
  trendingUp: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up' },
  person: { ios: 'person.crop.circle.fill', android: 'person' },
  eye: { ios: 'eye', android: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off' },
  star: { ios: 'star.fill', android: 'star' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  brain: { ios: 'brain.head.profile', android: 'psychology' },
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  edit: { ios: 'pencil', android: 'edit' },
  lock: { ios: 'lock.fill', android: 'lock' },
  code: { ios: 'chevron.left.forwardslash.chevron.right', android: 'code' },
  stop: { ios: 'stop.circle', android: 'stop_circle' },
  target: { ios: 'target', android: 'target' },
  rocket: { ios: 'paperplane.fill', android: 'rocket_launch' },
  mail: { ios: 'envelope.fill', android: 'mail' },
  voice: { ios: 'person.wave.2.fill', android: 'record_voice_over' },
  hourglass: { ios: 'hourglass', android: 'hourglass_empty' },
  minus: { ios: 'minus', android: 'remove' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  tune: { ios: 'slider.horizontal.3', android: 'tune' },
  thumbsUp: { ios: 'hand.thumbsup.fill', android: 'thumb_up' },
} satisfies Record<string, { ios: IosSymbol; android: MaterialSymbol }>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 20, color, style }: IconProps) {
  const theme = useTheme();
  const symbol = ICONS[name];
  return (
    <SymbolView
      name={{ ios: symbol.ios, android: symbol.android, web: symbol.android }}
      size={size}
      tintColor={color ?? theme.text}
      style={[{ width: size, height: size }, style]}
    />
  );
}
