import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';

/** Gradient level medallion ("Lv 3"). */
export function LevelBadge({ level, size = 40 }: { level: number; size?: number }) {
  const gradients = useGradients();
  return (
    <LinearGradient
      colors={gradients.xp}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={`Level ${level}`}>
      <Text style={[styles.badgeLv, { fontSize: size * 0.22 }]}>LV</Text>
      <Text style={[styles.badgeNum, { fontSize: size * 0.4, lineHeight: size * 0.44 }]}>{level}</Text>
    </LinearGradient>
  );
}

export interface XpBarProps {
  level: number;
  levelXp: number;
  levelXpTarget: number;
  totalXp?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Level badge + animated XP bar towards the next level. */
export function XpBar({ level, levelXp, levelXpTarget, totalXp, compact = false, style }: XpBarProps) {
  const theme = useTheme();
  const gradients = useGradients();
  const pct = levelXpTarget > 0 ? Math.min(1, levelXp / levelXpTarget) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [pct, width]);

  const fill = useAnimatedStyle(() => ({ width: `${Math.max(width.value * 100, width.value > 0 ? 4 : 0)}%` }));

  return (
    <View style={[styles.row, style]}>
      <LevelBadge level={level} size={compact ? 32 : 40} />
      <View style={styles.flex}>
        <View style={styles.labels}>
          <Text variant="caption" tone="textSecondary">
            Level {level}
          </Text>
          <Text variant="caption" tone="textMuted">
            {levelXp}/{levelXpTarget} XP{totalXp !== undefined && !compact ? ` · ${totalXp} total` : ''}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Experience towards next level"
          accessibilityValue={{ min: 0, max: levelXpTarget, now: levelXp }}
          style={[styles.track, { backgroundColor: theme.surfaceMuted, height: compact ? 6 : 8 }]}>
          <Animated.View style={[styles.fill, fill]}>
            <LinearGradient colors={gradients.xp} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLv: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: -2,
  },
  badgeNum: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
