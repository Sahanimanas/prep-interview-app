import { computePlanProgress, describeDaysRemaining, INTERVIEW_TYPE_LABELS, type PlanDetail } from '@preppilot/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ErrorCallout } from '@/components/ai-callouts';
import { AiWorking } from '@/components/ai-working';
import { CompassIllustration } from '@/components/illustrations';
import { AchievementsPanel, ProgressPanel, StrategyPanel, TodayMission } from '@/components/plan/hub-panels';
import { MocksSection, QuestionsSection, QuizzesSection } from '@/components/plan/lists';
import { ScheduleSection } from '@/components/plan/schedule-section';
import { TechLogo } from '@/components/tech/tech-logo';
import {
  Badge,
  Button,
  Callout,
  Card,
  ErrorState,
  HeroCard,
  IconButton,
  Screen,
  SegmentedControl,
  Skeleton,
  SkeletonList,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { formatPlanDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { queryKeys, useDeletePlan, usePlan, useRetryPlan } from '@/lib/queries';

type Section = 'schedule' | 'questions' | 'quizzes' | 'mocks';
const SECTIONS = [
  { value: 'schedule', label: 'Journey' },
  { value: 'questions', label: 'Questions' },
  { value: 'quizzes', label: 'Quizzes' },
  { value: 'mocks', label: 'Mocks' },
] as const;

function PlanHero({ detail, compact }: { detail: PlanDetail; compact: boolean }) {
  const { plan } = detail;
  return (
    <HeroCard
      leading={<TechLogo technology={plan.technology} size={52} />}
      eyebrow={`${plan.technology} · ${plan.targetRole}${plan.company ? ` · ${plan.company}` : ''}`}
      title={plan.title}
      art={compact ? undefined : <CompassIllustration size={170} />}>
      <View style={styles.badges}>
        <Badge label={describeDaysRemaining(plan.daysRemaining)} tone="warning" icon="calendar" />
        <Badge label={`${formatPlanDate(plan.startDate)} → ${formatPlanDate(plan.interviewDate)}`} />
        <Badge label={`${plan.hoursPerDay} h/day`} icon="clock" />
      </View>
    </HeroCard>
  );
}

function GeneratingState({ detail }: { detail: PlanDetail }) {
  const { plan } = detail;
  return (
    <Card level={2}>
      <AiWorking
        title="Building your prep plan"
        messages={[
          `Mapping out ${plan.totalDays} days of ${plan.technology}…`,
          'Balancing topics against your schedule…',
          `Prioritising ${plan.interviewTypes.map((t) => INTERVIEW_TYPE_LABELS[t].toLowerCase()).join(', ')}…`,
          'Writing your day-one lessons…',
        ]}
        footnote="This usually takes about a minute. Feel free to leave — we'll keep working."
      />
    </Card>
  );
}

function FailedState({ detail, planId }: { detail: PlanDetail; planId: string }) {
  const retry = useRetryPlan(planId);
  return (
    <View style={styles.stack}>
      <Callout
        tone="danger"
        title="Plan generation failed"
        message={detail.plan.error ?? detail.planJob?.error ?? 'The AI could not generate this plan.'}
        actionLabel="Retry generation"
        onAction={() => retry.mutate()}
        actionLoading={retry.isPending}
      />
      <ErrorCallout error={retry.error} title="Retry failed" />
    </View>
  );
}

function PlanSkeleton() {
  return (
    <View style={styles.stack}>
      <Skeleton height={180} radius={Radius.xl} />
      <Skeleton height={220} radius={Radius.lg} />
      <SkeletonList count={2} />
    </View>
  );
}

function ReadyPlan({ detail, planId }: { detail: PlanDetail; planId: string }) {
  const { isWide } = useResponsive();
  const [section, setSection] = useState<Section>('schedule');
  const progress = computePlanProgress(detail);

  let content: ReactNode;
  if (section === 'schedule') {
    content =
      detail.days.length > 0 ? (
        <ScheduleSection days={detail.days} todayDayNumber={detail.stats.todayDayNumber} />
      ) : (
        <Callout tone="neutral" message="This plan has no scheduled topics." />
      );
  } else if (section === 'questions') content = <QuestionsSection planId={planId} />;
  else if (section === 'quizzes') content = <QuizzesSection planId={planId} />;
  else content = <MocksSection planId={planId} />;

  const main = (
    <View style={styles.stack}>
      <TodayMission detail={detail} />
      {!isWide ? <ProgressPanel detail={detail} progress={progress} /> : null}
      <SegmentedControl options={SECTIONS} value={section} onChange={setSection} />
      {content}
    </View>
  );

  if (!isWide) {
    return (
      <View style={styles.stack}>
        {main}
        <AchievementsPanel progress={progress} />
        <StrategyPanel detail={detail} />
      </View>
    );
  }

  return (
    <View style={styles.columns}>
      <View style={styles.mainColumn}>{main}</View>
      <View style={styles.rail}>
        <ProgressPanel detail={detail} progress={progress} />
        <AchievementsPanel progress={progress} columns={4} />
        <StrategyPanel detail={detail} defaultOpen />
      </View>
    </View>
  );
}

export default function PlanHubScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const theme = useTheme();
  const qc = useQueryClient();
  const { isWide } = useResponsive();
  const plan = usePlan(planId);
  const deletePlan = useDeletePlan();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        plan.refetch(),
        qc.invalidateQueries({ queryKey: queryKeys.questionsForPlan(planId) }),
        qc.invalidateQueries({ queryKey: queryKeys.quizzes(planId) }),
        qc.invalidateQueries({ queryKey: queryKeys.mocks(planId) }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete this plan?',
      'Lessons, questions, quizzes and mock interviews in this plan will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deletePlan.mutate(planId, {
              onSuccess: () => {
                haptics.success();
                router.back();
              },
              onError: (e) => {
                haptics.error();
                Alert.alert("Couldn't delete plan", getErrorMessage(e));
              },
            }),
        },
      ],
    );
  };

  const detail = plan.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: detail?.plan.technology ?? '',
          headerRight: () => (
            <IconButton
              icon="trash"
              accessibilityLabel="Delete plan"
              color={theme.danger}
              onPress={confirmDelete}
              disabled={deletePlan.isPending || !detail}
            />
          ),
        }}
      />
      <Screen wide backdrop refreshing={refreshing} onRefresh={onRefresh}>
        {plan.isPending ? (
          <PlanSkeleton />
        ) : plan.isError ? (
          <ErrorState error={plan.error} onRetry={() => void plan.refetch()} retrying={plan.isFetching} />
        ) : detail ? (
          <View style={styles.stack}>
            <PlanHero detail={detail} compact={!isWide} />
            {detail.plan.status === 'generating' ? (
              <GeneratingState detail={detail} />
            ) : detail.plan.status === 'failed' ? (
              <FailedState detail={detail} planId={planId} />
            ) : (
              <ReadyPlan detail={detail} planId={planId} />
            )}
            {detail.plan.status !== 'ready' ? (
              <Button title="Back to plans" variant="ghost" onPress={() => router.back()} />
            ) : null}
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.four,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  rail: {
    width: 360,
    gap: Spacing.three,
  },
});
