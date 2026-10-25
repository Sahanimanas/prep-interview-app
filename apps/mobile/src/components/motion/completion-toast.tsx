import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { elevation, Radius, Spacing } from '@/constants/theme';
import { useColorSchemeName, useTheme } from '@/hooks/use-theme';

import { AnimatedCheck } from './animated-check';

export interface CompletionToastProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onHide: () => void;
  durationMs?: number;
}

/** Centered "done!" card with a self-drawing checkmark; hides itself after a moment. */
export function CompletionToast({ visible, title, subtitle, onHide, durationMs = 1900 }: CompletionToastProps) {
  const theme = useTheme();
  const scheme = useColorSchemeName();

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(onHide, durationMs);
    return () => clearTimeout(id);
  }, [visible, onHide, durationMs]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View
        entering={ZoomIn.springify().damping(12)}
        exiting={FadeOut.duration(250)}
        accessibilityLiveRegion="assertive"
        style={[styles.card, elevation(3, scheme), { backgroundColor: theme.surface, borderColor: theme.successBorder }]}>
        <AnimatedCheck size={76} color={theme.success} background={theme.successMuted} />
        <Text variant="heading" align="center">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyStrong" color="#F59E0B" align="center">
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 900,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
});
