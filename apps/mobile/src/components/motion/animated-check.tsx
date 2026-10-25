import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const CIRCLE_LEN = 2 * Math.PI * 22;
const CHECK_LEN = 34;

/** A circle that draws itself, then a check stroke, with a springy pop. */
export function AnimatedCheck({ size = 72, color, background }: { size?: number; color: string; background: string }) {
  const reduced = useReducedMotion();
  const ring = useSharedValue(reduced ? 1 : 0);
  const tick = useSharedValue(reduced ? 1 : 0);
  const scale = useSharedValue(reduced ? 1 : 0.6);

  useEffect(() => {
    if (reduced) return;
    ring.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    tick.value = withDelay(260, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    scale.value = withSpring(1, { damping: 8, stiffness: 160 });
  }, [reduced, ring, tick, scale]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCLE_LEN * (1 - ring.value) }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - tick.value) }));
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, pop]}>
      <Svg width={size} height={size} viewBox="0 0 52 52">
        <Circle cx={26} cy={26} r={22} fill={background} />
        <AnimatedCircle
          cx={26}
          cy={26}
          r={22}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${CIRCLE_LEN}`}
          animatedProps={ringProps}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
        <AnimatedPath
          d="M15 27 L23 34 L37 19"
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${CHECK_LEN}`}
          animatedProps={tickProps}
        />
      </Svg>
    </Animated.View>
  );
}
