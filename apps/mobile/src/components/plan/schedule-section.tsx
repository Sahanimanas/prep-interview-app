import { formatMinutes, type PlanDay, type TopicSummary } from '@preppilot/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/pressable-scale';
import { PulseHalo } from '@/components/motion/pulse';
import { TopicCover } from '@/components/tech/topic-cover';
import { Badge, Icon, Text, type IconName } from '@/components/ui';
import { elevation, Radius, Spacing } from '@/constants/theme';
import { useColorSchemeName, useGradients, useTheme } from '@/hooks/use-theme';
import { formatPlanDate } from '@/lib/format';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE } from '@/lib/labels';

const NODE = 36;

function ContentDot({ icon, ready, label }: { icon: IconName; ready: boolean; label: string }) {
  const theme = useTheme();
  return (
    <View accessibilityLabel={`${label} ${ready ? 'ready' : 'not generated'}`} style={styles.contentDot}>
      <Icon name={icon} size={12} color={ready ? theme.primary : theme.textMuted} />
      <Text variant="caption" color={ready ? theme.primary : theme.textMuted}>
        {label}
      </Text>
    </View>
  );
}

function TopicTile({ topic }: { topic: TopicSummary }) {
  const theme = useTheme();
  const scheme = useColorSchemeName();
  const done = topic.status === 'completed';
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}, ${topic.status.replace('_', ' ')}`}
      onPress={() => router.push({ pathname: '/topic/[topicId]', params: { topicId: topic.id } })}
      style={[
        styles.tile,
        elevation(1, scheme),
        { backgroundColor: theme.surface, borderColor: done ? theme.successBorder : theme.border },
      ]}>
      <View style={styles.thumbWrap}>
        <TopicCover seed={topic.id} height={64} radius={Radius.md} style={styles.thumb} />
        <View style={[StyleSheet.absoluteFill, styles.thumbIcon]}>
          {done ? (
            <View style={[styles.doneBadge, { backgroundColor: theme.success }]}>
              <Icon name="check" size={16} color="#FFFFFF" />
            </View>
          ) : (
            <Icon name={topic.status === 'in_progress' ? 'timer' : 'play'} size={22} color="#FFFFFF" />
          )}
        </View>
      </View>
      <View style={styles.tileBody}>
        <Text variant="bodyStrong" numberOfLines={2} style={done ? { color: theme.textSecondary } : undefined}>
          {topic.title}
        </Text>
        <View style={styles.meta}>
          <Badge label={DIFFICULTY_LABEL[topic.difficulty]} tone={DIFFICULTY_TONE[topic.difficulty]} />
          <Badge label={formatMinutes(topic.estimatedMinutes)} icon="clock" />
          {topic.status === 'in_progress' ? <Badge label="In progress" tone="primary" /> : null}
        </View>
        <View style={styles.contentRow}>
          <ContentDot icon="book" ready={topic.hasDoc} label="Lesson" />
          <ContentDot icon="chat" ready={topic.questionCount > 0} label={topic.questionCount > 0 ? `${topic.questionCount} Qs` : 'Qs'} />
          <ContentDot icon="quiz" ready={topic.hasQuiz} label="Quiz" />
        </View>
      </View>
      <Icon name="chevronRight" size={14} color={theme.textMuted} />
    </PressableScale>
  );
}

function DayNode({ day, state }: { day: PlanDay; state: 'done' | 'today' | 'upcoming' }) {
  const theme = useTheme();
  const gradients = useGradients();
  if (state === 'done') {
    return (
      <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.node}>
        <Icon name="check" size={18} color="#FFFFFF" />
      </LinearGradient>
    );
  }
  if (state === 'today') {
    return (
      <PulseHalo size={NODE} color={theme.primary}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.node}>
          <Text variant="smallStrong" color="#FFFFFF">
            {day.dayNumber}
          </Text>
        </LinearGradient>
      </PulseHalo>
    );
  }
  return (
    <View style={[styles.node, { backgroundColor: theme.surface, borderColor: theme.borderStrong, borderWidth: 2 }]}>
      <Text variant="smallStrong" tone="textSecondary">
        {day.dayNumber}
      </Text>
    </View>
  );
}

/** The schedule as a vertical journey: day nodes on a rail, topic tiles beside them. */
export function ScheduleSection({ days, todayDayNumber }: { days: PlanDay[]; todayDayNumber: number }) {
  const theme = useTheme();
  return (
    <View>
      {days.map((day, i) => {
        const done = day.topics.length > 0 && day.topics.every((t) => t.status === 'completed');
        const state = done ? 'done' : day.dayNumber === todayDayNumber ? 'today' : 'upcoming';
        const last = i === days.length - 1;
        return (
          <Animated.View key={day.dayNumber} entering={FadeInDown.delay(Math.min(i, 8) * 60).duration(350)} style={styles.dayRow}>
            <View style={styles.rail}>
              <DayNode day={day} state={state} />
              {!last ? (
                <View style={[styles.line, { backgroundColor: done ? theme.success : theme.border }]} />
              ) : null}
            </View>
            <View style={[styles.dayBody, !last && styles.dayBodySpacing]}>
              <View style={styles.dayHeader}>
                <Text variant="caption" tone={state === 'today' ? 'primary' : 'textMuted'}>
                  {state === 'today' ? 'TODAY · ' : ''}Day {day.dayNumber} · {formatPlanDate(day.date)}
                </Text>
                <Text variant="subheading" numberOfLines={2}>
                  {day.theme}
                </Text>
              </View>
              <View style={styles.topics}>
                {day.topics.map((topic) => (
                  <TopicTile key={topic.id} topic={topic} />
                ))}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayRow: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  rail: {
    width: NODE,
    alignItems: 'center',
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 3,
    borderRadius: 2,
    marginVertical: Spacing.one,
  },
  dayBody: {
    flex: 1,
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  dayBodySpacing: {
    paddingBottom: Spacing.four,
  },
  dayHeader: {
    gap: Spacing.half,
  },
  topics: {
    gap: Spacing.two + 2,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.two + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  thumbWrap: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: 64,
  },
  thumbIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tileBody: {
    flex: 1,
    gap: Spacing.one,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  contentRow: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  contentDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half + 1,
  },
});
