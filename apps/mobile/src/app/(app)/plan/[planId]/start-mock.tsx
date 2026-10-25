import { LIMITS, MOCK_TYPE_LABELS, MOCK_TYPES, type MockType } from '@preppilot/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorCallout } from '@/components/ai-callouts';
import { AiWorking } from '@/components/ai-working';
import { InterviewerIllustration } from '@/components/illustrations';
import { TopicPicker } from '@/components/plan/topic-picker';
import { Button, Card, ErrorState, Icon, Screen, SkeletonList, Stepper, Text, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { useCreateMock, usePlan } from '@/lib/queries';

const MAX_TOPICS = 20;

const TYPE_META: Record<MockType, { icon: IconName; hint: string }> = {
  technical: { icon: 'code', hint: 'Concepts, trade-offs and how things work under the hood.' },
  behavioral: { icon: 'person', hint: 'STAR-style questions about your experience.' },
  system_design: { icon: 'target', hint: 'Design a system end to end and defend your choices.' },
  mixed: { icon: 'voice', hint: 'A bit of everything, like a full interview loop.' },
};

function TypeOption({ type, selected, onPress }: { type: MockType; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const meta = TYPE_META[type];
  return (
    <Card
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityLabel={MOCK_TYPE_LABELS[type]}
      style={[styles.typeCard, selected && { borderColor: theme.primary, borderWidth: 1.5, backgroundColor: theme.primaryMuted }]}>
      <View style={[styles.typeIcon, { backgroundColor: selected ? theme.primary : theme.surfaceMuted }]}>
        <Icon name={meta.icon} size={18} color={selected ? theme.onPrimary : theme.textSecondary} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={selected ? theme.primary : theme.text}>
          {MOCK_TYPE_LABELS[type]}
        </Text>
        <Text variant="caption" tone="textSecondary">
          {meta.hint}
        </Text>
      </View>
      {selected ? <Icon name="checkCircle" size={20} color={theme.primary} /> : null}
    </Card>
  );
}

export default function StartMockSheet() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const plan = usePlan(planId);
  const create = useCreateMock(planId);
  const [type, setType] = useState<MockType>('technical');
  const [questionCount, setQuestionCount] = useState(5);
  const [topicIds, setTopicIds] = useState<string[]>([]);

  const start = () => {
    create.mutate(
      { type, questionCount, topicIds: topicIds.length > 0 ? topicIds : undefined },
      {
        onSuccess: (mock) => {
          haptics.success();
          router.replace({ pathname: '/mock/[mockId]', params: { mockId: mock.id } });
        },
        onError: () => haptics.error(),
      },
    );
  };

  if (create.isPending || create.isSuccess) {
    return (
      <Screen>
        <AiWorking
          art={<InterviewerIllustration size={190} />}
          title="Your interviewer is getting ready"
          messages={['Reviewing your plan…', 'Choosing the first question…', 'Settling into the interview room…']}
          footnote="This can take up to a minute."
        />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Start interview" icon="play" size="lg" fullWidth onPress={start} />}>
      <View style={styles.body}>
        <View style={styles.intro}>
          <InterviewerIllustration size={170} />
          <Text tone="textSecondary" align="center">
            A realistic interview with an AI interviewer. Every answer is scored, and you get a hiring-style scorecard at the end.
          </Text>
        </View>
        <ErrorCallout error={create.error} title="Couldn't start the interview" />
        <View style={styles.group}>
          <Text variant="smallStrong" tone="textSecondary">
            Interview type
          </Text>
          {MOCK_TYPES.map((t) => (
            <TypeOption key={t} type={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>

        <Stepper
          label="Questions"
          value={questionCount}
          onChange={setQuestionCount}
          min={LIMITS.mockQuestionCount.min}
          max={LIMITS.mockQuestionCount.max}
          hint="Each answer takes a few seconds for the interviewer to evaluate."
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
  group: {
    gap: Spacing.two,
  },
  intro: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
});
