import { useEffect, useState } from 'react';
import { StyleSheet, Text as RNText, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const COLORS = ['#4F46E5', '#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#0EA5E9', '#F97316'];
const EMOJI = ['🎉', '⭐', '✨', '🏆', '🚀'];
const PIECES = 42;
const DURATION = 2400;

interface PieceSpec {
  id: number;
  vx: number;
  vy: number;
  spin: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle' | 'emoji';
  emoji: string;
  delay: number;
}

function makePieces(): PieceSpec[] {
  return Array.from({ length: PIECES }, (_, id) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = 380 + Math.random() * 420;
    const roll = Math.random();
    return {
      id,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 1080,
      size: 7 + Math.random() * 8,
      color: COLORS[id % COLORS.length] ?? '#4F46E5',
      shape: roll < 0.12 ? 'emoji' : roll < 0.55 ? 'rect' : 'circle',
      emoji: EMOJI[id % EMOJI.length] ?? '🎉',
      delay: Math.random() * 120,
    };
  });
}

function Piece({ spec, originX, originY }: { spec: PieceSpec; originX: number; originY: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration: DURATION, easing: Easing.linear }));
  }, [spec.delay, t]);

  const style = useAnimatedStyle(() => {
    const s = t.value * (DURATION / 1000); // seconds
    const gravity = 900;
    return {
      opacity: t.value < 0.8 ? 1 : (1 - t.value) * 5,
      transform: [
        { translateX: originX + spec.vx * s * 0.9 },
        { translateY: originY + spec.vy * s + 0.5 * gravity * s * s },
        { rotate: `${spec.spin * t.value}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.piece, style]}>
      {spec.shape === 'emoji' ? (
        <RNText style={{ fontSize: spec.size * 2 }}>{spec.emoji}</RNText>
      ) : (
        <View
          style={{
            width: spec.size,
            height: spec.shape === 'rect' ? spec.size * 0.55 : spec.size,
            borderRadius: spec.shape === 'circle' ? spec.size : 2,
            backgroundColor: spec.color,
          }}
        />
      )}
    </Animated.View>
  );
}

function Burst({ onDone, emoji }: { onDone: () => void; emoji: string }) {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState(makePieces);
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 180 }),
      withDelay(
        900,
        withTiming(0, { duration: 350 }, (finished) => {
          if (finished) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [pop, onDone]);

  const popStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.4 + pop.value * 0.6 }] }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay]}>
      {pieces.map((p) => (
        <Piece key={p.id} spec={p} originX={width / 2} originY={height * 0.45} />
      ))}
      <Animated.View style={[styles.center, popStyle]}>
        <RNText style={styles.bigEmoji}>{emoji}</RNText>
      </Animated.View>
    </View>
  );
}

export interface CelebrationProps {
  /** Flip to true to play once; `onDone` should reset it. */
  visible: boolean;
  onDone: () => void;
  emoji?: string;
}

/** Confetti + emoji burst built with Reanimated. Renders nothing under reduced motion. */
export function Celebration({ visible, onDone, emoji = '🎉' }: CelebrationProps) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (visible && reduced) onDone();
  }, [visible, reduced, onDone]);
  if (!visible || reduced) return null;
  return <Burst onDone={onDone} emoji={emoji} />;
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    elevation: 1000,
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 88,
  },
});
