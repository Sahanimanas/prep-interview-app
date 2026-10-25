import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius, type GradientStops } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  /** Solid fill colour; defaults to the brand gradient. */
  color?: string;
  gradient?: GradientStops;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ProgressBar({ value, color, gradient, height = 8, style, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const gradients = useGradients();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: theme.surfaceMuted }, style]}>
      <Animated.View style={[styles.fill, color ? { backgroundColor: color } : null, fillStyle]}>
        {color ? null : (
          <LinearGradient
            colors={gradient ?? gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
});
