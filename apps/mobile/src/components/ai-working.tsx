import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SparklesIllustration } from '@/components/illustrations';
import { Float } from '@/components/motion/pulse';
import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Cycles through status lines so long waits feel alive. */
function useRotatingMessage(messages: readonly string[], intervalMs = 3500): string {
  const [index, setIndex] = useState(0);
  const count = messages.length;
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs]);
  return messages[index % Math.max(count, 1)] ?? '';
}

/** Indeterminate shimmer bar. */
function Shimmer() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 0 })),
      -1,
    );
  }, [reduced, t]);
  const bar = useAnimatedStyle(() => ({ left: `${-35 + t.value * 135}%` }));
  return (
    <View style={[styles.shimmerTrack, { backgroundColor: theme.surfaceMuted }]}>
      <Animated.View style={[styles.shimmerBar, { backgroundColor: theme.primary }, reduced ? styles.shimmerStatic : bar]} />
    </View>
  );
}

export interface AiWorkingProps {
  title: string;
  messages?: readonly string[];
  footnote?: string;
  compact?: boolean;
  /** Override the default sparkles artwork. */
  art?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Animated "AI is working" state: floating sparkles, rotating status line and a shimmer bar. */
export function AiWorking({ title, messages = [], footnote, compact = false, art, style }: AiWorkingProps) {
  const message = useRotatingMessage(messages);
  return (
    <View style={[styles.container, compact && styles.compact, style]} accessibilityLiveRegion="polite">
      <Float distance={compact ? 4 : 8}>{art ?? <SparklesIllustration size={compact ? 96 : 150} />}</Float>
      <Text variant={compact ? 'subheading' : 'heading'} align="center">
        {title}
      </Text>
      {message ? (
        <Animated.View key={message} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
          <Text variant="small" tone="textSecondary" align="center">
            {message}
          </Text>
        </Animated.View>
      ) : null}
      <Shimmer />
      {footnote ? (
        <Text variant="caption" tone="textMuted" align="center">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  compact: {
    paddingVertical: Spacing.three,
  },
  shimmerTrack: {
    width: 160,
    height: 4,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginVertical: Spacing.one,
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '35%',
    borderRadius: Radius.pill,
  },
  shimmerStatic: {
    left: '32%',
  },
});
