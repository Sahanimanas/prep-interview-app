import {
  formatMinutes,
  XP_RULES,
  type PlanDetail,
  type PlanProgressSummary,
  type TopicSummary,
} from '@preppilot/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AchievementGrid } from '@/components/gamification/achievements';
import { ProgressRing } from '@/components/gamification/progress-ring';
import { XpBar } from '@/components/gamification/xp-bar';
import { TrophyIllustration } from '@/components/illustrations';
import { MarkdownView } from '@/components/markdown';
import { TopicCover } from '@/components/tech/topic-cover';
import { Badge, Button, Card, Icon, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE } from '@/lib/labels';

// ---------------------------------------------------------------- Today's mission

/** Today's first unfinished topic, else the next unfinished topic anywhere, else null (all done). */
export function pickMission(detail: PlanDetail): { topic: TopicSummary; dayNumber: number; isToday: boolean } | null {
  const today = detail.days.find((d) => d.dayNumber === detail.stats.todayDayNumber);
  const todayTopic = today?.topics.find((t) => t.status !== 'completed');
  if (today && todayTopic) return { topic: todayTopic, dayNumber: today.dayNumber, isToday: true };
  for (const day of detail.days) {
    const t = day.topics.find((x) => x.status !== 'completed');
    if (t) return { topic: t, dayNumber: day.dayNumber, isToday: day.dayNumber === detail.stats.todayDayNumber };
  }
  return null;
}

export function TodayMission({ detail }: { detail: PlanDetail }) {
  const mission = pickMission(detail);

  if (!mission) {
    return (
      <Card level={2} style={styles.allDone}>
        <TrophyIllustration size={120} />
        <View style={styles.flex}>
          <Text variant="overline" tone="success">
            Mission accomplished
          </Text>
          <Text variant="heading">Every topic is complete!</Text>
          <Text variant="small" tone="textSecondary">
            Lock it in with a mock interview or a mixed revision quiz.
          </Text>
          <View style={styles.row}>
            <Button
              title="Mock interview"
              icon="play"
              size="sm"
              onPress={() => router.push({ pathname: '/plan/[planId]/start-mock', params: { planId: detail.plan.id } })}
            />
            <Button
              title="Revision quiz"
              variant="secondary"
              size="sm"
              onPress={() => router.push({ pathname: '/plan/[planId]/revision-quiz', params: { planId: detail.plan.id } })}
            />
          </View>
        </View>
      </Card>
    );
  }

  const { topic, dayNumber, isToday } = mission;
  const xp = XP_RULES.topicCompleted[topic.difficulty];
  const started = topic.status === 'in_progress';
  const open = () => router.push({ pathname: '/topic/[topicId]', params: { topicId: topic.id } });

  return (
    <Card flush level={2}>
      <TopicCover seed={topic.id} technology={detail.plan.technology} height={120} radius={Radius.lg} style={styles.missionCover}>
        <View style={styles.row}>
          <Badge label={isToday ? "Today's mission" : `Next up · Day ${dayNumber}`} tone="primary" icon="target" />
          <Badge label={`+${xp} XP`} tone="warning" icon="bolt" />
        </View>
      </TopicCover>
      <View style={styles.missionBody}>
        <Text variant="heading">{topic.title}</Text>
        <Text variant="small" tone="textSecondary" numberOfLines={2}>
          {topic.description}
        </Text>
        <View style={styles.meta}>
          <Badge label={DIFFICULTY_LABEL[topic.difficulty]} tone={DIFFICULTY_TONE[topic.difficulty]} />
          <Badge label={formatMinutes(topic.estimatedMinutes)} icon="clock" />
          {topic.hasDoc ? <Badge label="Lesson ready" tone="success" icon="book" /> : null}
        </View>
        <Button title={started ? 'Continue mission' : 'Start mission'} icon="play" size="lg" fullWidth onPress={open} />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------- Progress

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.surfaceMuted }]}>
      <Text variant="caption" tone="textSecondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading">{value}</Text>
      {sub ? (
        <Text variant="caption" tone="textMuted" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function ProgressPanel({ detail, progress }: { detail: PlanDetail; progress: PlanProgressSummary }) {
  const gradients = useGradients();
  const { stats, plan } = detail;
  return (
    <Card level={1} style={styles.panel}>
      <View style={styles.progressTop}>
        <ProgressRing progress={progress.completionPct / 100} size={96} strokeWidth={10} colors={gradients.success} accessibilityLabel="Plan completion">
          <Text variant="stat">{progress.completionPct}%</Text>
          <Text variant="caption" tone="textMuted">
            done
          </Text>
        </ProgressRing>
        <View style={styles.flex}>
          <Text variant="subheading">Your progress</Text>
          <Text variant="small" tone="textSecondary">
            {stats.completedTopics} of {stats.totalTopics} topics · Day {stats.todayDayNumber} of {plan.totalDays}
          </Text>
          <XpBar level={progress.level} levelXp={progress.levelXp} levelXpTarget={progress.levelXpTarget} totalXp={progress.xp} style={styles.xp} />
        </View>
      </View>
      <View style={styles.stats}>
        <StatTile
          label="Quiz avg"
          value={stats.averageQuizScore !== null ? `${Math.round(stats.averageQuizScore)}%` : '—'}
          sub={`${stats.quizAttempts} attempt${stats.quizAttempts === 1 ? '' : 's'}`}
        />
        <StatTile
          label="Mock avg"
          value={stats.averageMockScore !== null ? `${Math.round(stats.averageMockScore)}` : '—'}
          sub={`${stats.mocksCompleted} done`}
        />
        <StatTile label="Total XP" value={`${progress.xp}`} sub={`Level ${progress.level}`} />
      </View>
    </Card>
  );
}

export function AchievementsPanel({ progress, columns = 4 }: { progress: PlanProgressSummary; columns?: number }) {
  return (
    <Card level={1} style={styles.panel}>
      <View style={styles.inline}>
        <Icon name="star" size={18} color="#F59E0B" />
        <Text variant="subheading">Achievements</Text>
      </View>
      <AchievementGrid achievements={progress.achievements} columns={columns} />
    </Card>
  );
}

// ---------------------------------------------------------------- Strategy

export function StrategyPanel({ detail, defaultOpen = false }: { detail: PlanDetail; defaultOpen?: boolean }) {
  const theme = useTheme();
  const { plan } = detail;
  const [open, setOpen] = useState(defaultOpen);
  if (!plan.summary && plan.tips.length === 0) return null;

  return (
    <Card level={1} style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptics.selection();
          setOpen((s) => !s);
        }}
        style={styles.between}>
        <View style={styles.inline}>
          <Icon name="sparkles" size={18} color={theme.primary} />
          <Text variant="subheading">Your AI strategy</Text>
        </View>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={theme.textMuted} />
      </Pressable>
      {open && plan.summary ? <MarkdownView compact>{plan.summary}</MarkdownView> : null}
      {plan.tips.length > 0 ? (
        <View style={styles.tips}>
          {(open ? plan.tips : plan.tips.slice(0, 2)).map((tip) => (
            <View key={tip} style={[styles.tip, { backgroundColor: theme.warningMuted, borderColor: theme.warningBorder }]}>
              <Icon name="lightbulb" size={16} color={theme.warning} style={styles.tipIcon} />
              <Text variant="small" style={styles.flex}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {!open && (plan.summary || plan.tips.length > 2) ? (
        <Text variant="smallStrong" tone="primary" onPress={() => setOpen(true)}>
          Read full strategy
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  missionCover: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  missionBody: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginBottom: Spacing.one,
  },
  panel: {
    gap: Spacing.three - 4,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  xp: {
    marginTop: Spacing.two,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statTile: {
    flex: 1,
    padding: Spacing.three - 6,
    borderRadius: Radius.md,
    gap: Spacing.half,
  },
  tips: {
    gap: Spacing.two,
  },
  tip: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  tipIcon: {
    marginTop: 2,
  },
});
