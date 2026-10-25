import { LIMITS, type Job } from '@preppilot/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorCallout } from '@/components/ai-callouts';
import { AiWorking } from '@/components/ai-working';
import { TargetIllustration } from '@/components/illustrations';
import { TopicPicker } from '@/components/plan/topic-picker';
import { Button, Callout, ErrorState, Screen, SkeletonList, Stepper, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { queryKeys, useCreateRevisionQuiz, useJob, usePlan } from '@/lib/queries';

const MAX_TOPICS = 30;

export default function RevisionQuizSheet() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const qc = useQueryClient();
  const plan = usePlan(planId);
  const create = useCreateRevisionQuiz(planId);
  const [questionCount, setQuestionCount] = useState(10);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const jobQuery = useJob(job?.id ?? null, job ?? undefined);

  const status = jobQuery.data?.status;
  const resultId = jobQuery.data?.resultId;

  useEffect(() => {
    if (status === 'succeeded' && resultId) {
      haptics.success();
      void qc.invalidateQueries({ queryKey: queryKeys.quizzes(planId) });
      router.replace({ pathname: '/quiz/[quizId]', params: { quizId: resultId } });
    } else if (status === 'failed') {
      haptics.error();
    }
  }, [status, resultId, planId, qc]);

  const submit = () => {
    create.mutate(
      { questionCount, topicIds: topicIds.length > 0 ? topicIds : undefined },
      { onSuccess: (j) => setJob(j) },
    );
  };

  const reset = () => {
    setJob(null);
    create.reset();
  };

  const working = create.isPending || (job !== null && status !== 'failed' && status !== 'succeeded');
  const failedJob = status === 'failed' ? jobQuery.data : null;

  if (working || (status === 'succeeded' && resultId)) {
    return (
      <Screen>
        <AiWorking
          art={<TargetIllustration size={170} />}
          title="Writing your revision quiz"
          messages={['Picking the most important concepts…', 'Writing tricky distractors…', 'Adding explanations…']}
          footnote="This usually takes 20–40 seconds."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={failedJob ? 'Try again' : 'Generate quiz'}
          icon="sparkles"
          size="lg"
          fullWidth
          onPress={failedJob ? () => {
            reset();
            submit();
          } : submit}
          disabled={!plan.data}
        />
      }>
      <View style={styles.body}>
        <View style={styles.intro}>
          <TargetIllustration size={140} />
        </View>
        <Text tone="textSecondary" align="center">
          Mix questions across topics to check what has stuck. Results count towards your plan stats.
        </Text>

        {failedJob ? (
          <Callout tone="danger" title="Quiz generation failed" message={failedJob.error ?? 'Please try again.'} />
        ) : null}
        <ErrorCallout error={create.error} title="Couldn't start the quiz" />
        {jobQuery.isError ? <ErrorCallout error={jobQuery.error} onRetry={() => void jobQuery.refetch()} /> : null}

        <Stepper
          label="Number of questions"
          value={questionCount}
          onChange={setQuestionCount}
          min={LIMITS.revisionQuizQuestionCount.min}
          max={LIMITS.revisionQuizQuestionCount.max}
        />

        {plan.isPending ? (
          <SkeletonList count={2} lines={2} />
        ) : plan.isError ? (
          <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />
        ) : (
          <TopicPicker days={plan.data.days} selected={topicIds} onChange={setTopicIds} max={MAX_TOPICS} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.four,
  },
  intro: {
    alignItems: 'center',
    marginBottom: -Spacing.two,
  },
});
