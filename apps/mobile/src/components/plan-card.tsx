import { computePlanProgress, describeDaysRemaining, type PlanSummary } from '@preppilot/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/gamification/progress-ring';
import { XpBar } from '@/components/gamification/xp-bar';
import { TopicCover } from '@/components/tech/topic-cover';
import { Badge, Card, Icon, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { percent } from '@/lib/format';
import { countdownTone } from '@/lib/labels';
import { usePlan } from '@/lib/queries';

function PlanXp({ planId }: { planId: string }) {
  const detail = usePlan(planId, { enabled: true });
  if (!detail.data) return <Skeleton height={34} radius={Radius.md} />;
  const progress = computePlanProgress(detail.data);
  return <XpBar compact level={progress.level} levelXp={progress.levelXp} levelXpTarget={progress.levelXpTarget} />;
}

export function PlanCard({ plan }: { plan: PlanSummary }) {
  const theme = useTheme();
  const { completedTopics, totalTopics } = plan.progress;
  const pct = percent(completedTopics, totalTopics);
  const ready = plan.status === 'ready';

  return (
    <Card
      flush
      level={2}
      accessibilityLabel={`${plan.title}. ${describeDaysRemaining(plan.daysRemaining)}. ${pct}% complete`}
      onPress={() => router.push({ pathname: '/plan/[planId]', params: { planId: plan.id } })}>
      <TopicCover seed={plan.id} technology={plan.technology} height={92} radius={Radius.lg} logoSize={44} style={styles.cover}>
        <View style={styles.coverRow}>
          {plan.status === 'generating' ? (
            <Badge label="Generating plan…" tone="primary" icon="sparkles" />
          ) : plan.status === 'failed' ? (
            <Badge label="Generation failed" tone="danger" icon="warning" />
          ) : (
            <Badge label={describeDaysRemaining(plan.daysRemaining)} tone={countdownTone(plan.daysRemaining)} icon="calendar" />
          )}
        </View>
      </TopicCover>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text variant="heading" numberOfLines={2}>
              {plan.title}
            </Text>
            <Text variant="small" tone="textSecondary" numberOfLines={1}>
              {plan.technology} · {plan.targetRole} · {plan.totalDays} days
            </Text>
          </View>
          {ready ? (
            <ProgressRing progress={pct / 100} size={58} strokeWidth={6} accessibilityLabel="Plan completion">
              <Text variant="smallStrong">{pct}%</Text>
            </ProgressRing>
          ) : (
            <Icon name="chevronRight" size={16} color={theme.textMuted} />
          )}
        </View>

        {ready ? (
          <>
            <PlanXp planId={plan.id} />
            <Text variant="caption" tone="textMuted">
              {completedTopics}/{totalTopics} topics completed
            </Text>
          </>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  coverRow: {
    flexDirection: 'row',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.three - 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  titleCol: {
    flex: 1,
    gap: Spacing.half,
  },
});
