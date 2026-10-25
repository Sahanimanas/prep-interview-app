import { VERDICT_LABELS, type MockScorecard } from '@preppilot/shared';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ProgressRing } from '@/components/gamification/progress-ring';
import { TargetIllustration, TrophyIllustration } from '@/components/illustrations';
import { Badge, Card, Icon, Text, type IconName } from '@/components/ui';
import { Spacing, toneColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { scoreTone, VERDICT_TONE } from '@/lib/labels';

function BulletList({
  title,
  items,
  icon,
  color,
  index,
}: {
  title: string;
  items: string[];
  icon: IconName;
  color: string;
  index: number;
}) {
  if (items.length === 0) return null;
  return (
    <Animated.View entering={FadeInDown.delay(250 + index * 120).duration(350)}>
      <Card level={1} style={[styles.listCard, { borderLeftColor: color }]}>
        <View style={styles.inline}>
          <Icon name={icon} size={16} color={color} />
          <Text variant="subheading">{title}</Text>
        </View>
        {items.map((item) => (
          <View key={item} style={styles.bullet}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text variant="small" style={styles.flex}>
              {item}
            </Text>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

export function Scorecard({ scorecard }: { scorecard: MockScorecard }) {
  const theme = useTheme();
  const c = toneColors(theme, scoreTone(scorecard.overallScore));
  const great = scorecard.overallScore >= 70;
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(450)}>
        <Card level={2} style={styles.hero}>
          {great ? <TrophyIllustration size={150} /> : <TargetIllustration size={120} />}
          <Text variant="overline" color={c.fg}>
            Interview scorecard
          </Text>
          <ProgressRing progress={scorecard.overallScore / 100} size={128} strokeWidth={12} colors={[c.fg, c.fg]}>
            <Text style={[styles.score, { color: c.fg }]}>{scorecard.overallScore}</Text>
            <Text variant="caption" tone="textMuted">
              / 100
            </Text>
          </ProgressRing>
          <Badge label={VERDICT_LABELS[scorecard.verdict]} tone={VERDICT_TONE[scorecard.verdict]} icon="flag" />
          <Text variant="small" tone="textSecondary" align="center">
            {scorecard.summary}
          </Text>
        </Card>
      </Animated.View>
      <BulletList title="Strengths" items={scorecard.strengths} icon="thumbsUp" color={theme.success} index={0} />
      <BulletList title="To improve" items={scorecard.improvements} icon="trendingUp" color={theme.warning} index={1} />
      <BulletList title="Recommended topics" items={scorecard.recommendedTopics} icon="book" color={theme.primary} index={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three - 4,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  score: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
  },
  listCard: {
    gap: Spacing.two,
    borderLeftWidth: 4,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bullet: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  flex: {
    flex: 1,
  },
});
