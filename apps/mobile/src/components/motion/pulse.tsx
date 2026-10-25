import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Wraps a round element with an expanding, fading halo (e.g. "today" on the timeline). */
export function PulseHalo({
  size,
  color,
  children,
  style,
}: {
  size: number;
  color: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1);
  }, [reduced, t]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - t.value),
    transform: [{ scale: 1 + t.value * 0.9 }],
  }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {!reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: color }, halo]}
        />
      ) : null}
      {children}
    </View>
  );
}

/** Gentle up/down float for hero illustrations. */
export function Float({ children, distance = 6, style }: { children: ReactNode; distance?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, t]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: -distance * t.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
