import type { Achievement } from '@preppilot/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';

const ACHIEVEMENT_ICON: Record<Achievement['id'], IconName> = {
  first_step: 'flag',
  halfway: 'trendingUp',
  finisher: 'checkCircle',
  quiz_taker: 'quiz',
  quiz_whiz: 'star',
  first_mock: 'voice',
  interview_ready: 'target',
};

function Medal({ achievement, index }: { achievement: Achievement; index: number }) {
  const theme = useTheme();
  const gradients = useGradients();
  const icon = ACHIEVEMENT_ICON[achievement.id];
  return (
    <Animated.View
      entering={ZoomIn.delay(index * 50).springify()}
      style={styles.item}
      accessibilityLabel={`${achievement.title}: ${achievement.description}. ${achievement.unlocked ? 'Unlocked' : 'Locked'}`}>
      {achievement.unlocked ? (
        <LinearGradient colors={gradients.xp} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medal}>
          <Icon name={icon} size={22} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.medal, { backgroundColor: theme.surfaceMuted, borderColor: theme.border, borderWidth: 1 }]}>
          <Icon name={icon} size={20} color={theme.textMuted} />
          <View style={[styles.lock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Icon name="lock" size={9} color={theme.textMuted} />
          </View>
        </View>
      )}
      <Text variant="caption" align="center" numberOfLines={2} tone={achievement.unlocked ? 'text' : 'textMuted'}>
        {achievement.title}
      </Text>
    </Animated.View>
  );
}

/** Grid of achievement medals (locked ones are greyed with a padlock). */
export function AchievementGrid({ achievements, columns = 4 }: { achievements: Achievement[]; columns?: number }) {
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <View style={styles.container}>
      <Text variant="caption" tone="textSecondary">
        {unlocked} of {achievements.length} unlocked
      </Text>
      <View style={styles.grid}>
        {achievements.map((a, i) => (
          <View key={a.id} style={{ width: `${100 / columns}%` }}>
            <Medal achievement={a} index={i} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three - 4,
  },
  item: {
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.one,
  },
  medal: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
