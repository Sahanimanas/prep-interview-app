import {
  formatMinutes,
  isJobPending,
  TOPIC_STATUSES,
  XP_RULES,
  type Job,
  type PlanDetail,
  type TopicContentKind,
  type TopicDetail,
  type TopicStatus,
} from '@preppilot/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ErrorCallout } from '@/components/ai-callouts';
import { AiWorking } from '@/components/ai-working';
import { BooksIllustration, InterviewerIllustration, TargetIllustration } from '@/components/illustrations';
import { MarkdownView } from '@/components/markdown';
import { Celebration } from '@/components/motion/celebration';
import { CompletionToast } from '@/components/motion/completion-toast';
import { QuestionStudy } from '@/components/question-study';
import { TopicCover } from '@/components/tech/topic-cover';
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Screen,
  SegmentedControl,
  Skeleton,
  SkeletonList,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, scoreTone, TOPIC_STATUS_LABEL } from '@/lib/labels';
import { queryKeys, useGenerateTopicContent, usePlan, useTopic, useUpdateTopicStatus } from '@/lib/queries';

type Tab = 'learn' | 'questions' | 'quiz';
const TABS = [
  { value: 'learn', label: 'Learn' },
  { value: 'questions', label: 'Questions' },
  { value: 'quiz', label: 'Quiz' },
] as const;

const STATUS_OPTIONS = TOPIC_STATUSES.map((s) => ({ value: s, label: TOPIC_STATUS_LABEL[s] }));

const CONTENT_META: Record<
  TopicContentKind,
  { noun: string; emptyTitle: string; emptyMessage: string; working: string[]; art: (size: number) => ReactNode }
> = {
  doc: {
    noun: 'lesson',
    emptyTitle: 'Your lesson is one tap away',
    emptyMessage: 'Generate a focused lesson with examples, code and key takeaways for this topic.',
    working: ['Outlining the key concepts…', 'Writing examples…', 'Adding code snippets…', 'Summarising takeaways…'],
    art: (size) => <BooksIllustration size={size} />,
  },
  questions: {
    noun: 'question bank',
    emptyTitle: 'Practice like the real thing',
    emptyMessage: 'Generate likely interview questions with model answers and follow-ups — study them as flashcards.',
    working: ['Thinking like an interviewer…', 'Writing model answers…', 'Adding follow-up questions…'],
    art: (size) => <InterviewerIllustration size={size} />,
  },
  quiz: {
    noun: 'quiz',
    emptyTitle: 'Test what stuck',
    emptyMessage: 'Generate a multiple-choice quiz to check your understanding and earn XP.',
    working: ['Choosing what to test…', 'Writing questions…', 'Adding explanations…'],
    art: (size) => <TargetIllustration size={size} />,
  },
};

/**
 * Wraps a content tab: shows the content when present, a working state while a job is pending,
 * the job error with retry when it failed, and Generate / Regenerate CTAs.
 */
function ContentGate({
  topicId,
  kind,
  hasContent,
  job,
  children,
}: {
  topicId: string;
  kind: TopicContentKind;
  hasContent: boolean;
  job: Job | undefined;
  children: ReactNode;
}) {
  const meta = CONTENT_META[kind];
  const generate = useGenerateTopicContent(topicId);
  const pending = isJobPending(job) || generate.isPending;
  const failed = !pending && job?.status === 'failed';

  const run = (regenerate: boolean) => {
    generate.mutate({ kind, regenerate }, { onError: () => haptics.error() });
  };

  const confirmRegenerate = () => {
    Alert.alert(`Regenerate ${meta.noun}?`, `The current ${meta.noun} will be replaced with a fresh version.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Regenerate', onPress: () => run(true) },
    ]);
  };

  if (pending) {
    return (
      <Card level={2}>
        <AiWorking compact title={`Generating your ${meta.noun}`} messages={meta.working} footnote="Usually 15–45 seconds." />
      </Card>
    );
  }

  return (
    <View style={styles.gate}>
      <ErrorCallout error={generate.error} title={`Couldn't generate the ${meta.noun}`} />
      {failed ? (
        <Callout
          tone="danger"
          title={`The ${meta.noun} couldn't be generated`}
          message={job?.error ?? 'Something went wrong while generating. Please try again.'}
          actionLabel="Try again"
          onAction={() => run(hasContent)}
        />
      ) : null}
      {hasContent ? (
        <>
          {children}
          <Button
            title={`Regenerate ${meta.noun}`}
            icon="refresh"
            variant="ghost"
            size="sm"
            onPress={confirmRegenerate}
            style={styles.regenerate}
          />
        </>
      ) : failed ? null : (
        <Card level={1}>
          <EmptyState
            illustration={meta.art(170)}
            title={meta.emptyTitle}
            message={meta.emptyMessage}
            actionLabel={`Generate ${meta.noun}`}
            onAction={() => run(false)}
          />
        </Card>
      )}
    </View>
  );
}

function Takeaways({ items }: { items: string[] }) {
  const theme = useTheme();
  return (
    <Card level={1} style={[styles.takeaways, { borderColor: theme.primaryBorder }]}>
      <View style={styles.inline}>
        <Icon name="star" size={16} color="#F59E0B" />
        <Text variant="subheading">Key takeaways</Text>
      </View>
      {items.map((t, i) => (
        <View key={t} style={styles.takeaway}>
          <View style={[styles.takeawayNum, { backgroundColor: theme.primaryMuted }]}>
            <Text variant="caption" tone="primary">
              {i + 1}
            </Text>
          </View>
          <Text variant="small" style={styles.flex}>
            {t}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function LearnTab({ detail, onComplete, wide }: { detail: TopicDetail; onComplete: () => void; wide: boolean }) {
  const { doc, topic } = detail;
  const xp = XP_RULES.topicCompleted[topic.difficulty];
  const complete =
    topic.status !== 'completed' ? (
      <Button title={`Mark complete · +${xp} XP`} icon="checkCircle" size="lg" fullWidth onPress={onComplete} />
    ) : (
      <Callout tone="success" icon="checkCircle" title="Topic completed" message="Nice work — on to the next one!" />
    );

  return (
    <ContentGate topicId={topic.id} kind="doc" hasContent={!!doc} job={detail.jobs.doc}>
      {doc ? (
        wide ? (
          <View style={styles.learnColumns}>
            <Card level={1} style={[styles.lessonCard, styles.flex]}>
              <MarkdownView>{doc.contentMd}</MarkdownView>
            </Card>
            <View style={styles.learnRail}>
              {doc.keyTakeaways.length > 0 ? <Takeaways items={doc.keyTakeaways} /> : null}
              {complete}
            </View>
          </View>
        ) : (
          <View style={styles.gate}>
            <Card level={1} style={styles.lessonCard}>
              <MarkdownView>{doc.contentMd}</MarkdownView>
            </Card>
            {doc.keyTakeaways.length > 0 ? <Takeaways items={doc.keyTakeaways} /> : null}
            {complete}
          </View>
        )
      ) : null}
    </ContentGate>
  );
}

function QuestionsTab({ detail }: { detail: TopicDetail }) {
  return (
    <ContentGate topicId={detail.topic.id} kind="questions" hasContent={detail.questions.length > 0} job={detail.jobs.questions}>
      <QuestionStudy questions={detail.questions} numbered />
    </ContentGate>
  );
}

function QuizTab({ detail }: { detail: TopicDetail }) {
  const { quiz } = detail;
  return (
    <ContentGate topicId={detail.topic.id} kind="quiz" hasContent={!!quiz} job={detail.jobs.quiz}>
      {quiz ? (
        <Card level={2} style={styles.quizCard}>
          <TargetIllustration size={150} />
          <Text variant="heading" align="center">
            {quiz.title}
          </Text>
          <Text variant="small" tone="textSecondary" align="center">
            {quiz.questionCount} questions · {quiz.attemptCount} attempt{quiz.attemptCount === 1 ? '' : 's'} · +
            {XP_RULES.quizAttempt} XP per attempt
          </Text>
          <View style={styles.quizBadges}>
            {quiz.bestPercentage !== null ? (
              <Badge label={`Best ${quiz.bestPercentage}%`} tone={scoreTone(quiz.bestPercentage)} icon="star" />
            ) : null}
            {quiz.lastAttempt ? (
              <Badge label={`Last ${quiz.lastAttempt.score}/${quiz.lastAttempt.total}`} tone={scoreTone(quiz.lastAttempt.percentage)} />
            ) : null}
          </View>
          <Button
            title={quiz.attemptCount > 0 ? 'Retake quiz' : 'Start quiz'}
            icon="play"
            size="lg"
            fullWidth
            onPress={() => router.push({ pathname: '/quiz/[quizId]', params: { quizId: quiz.id } })}
          />
        </Card>
      ) : null}
    </ContentGate>
  );
}

function TopicSkeleton() {
  return (
    <View style={styles.body}>
      <Skeleton height={190} radius={Radius.xl} />
      <Skeleton height={44} radius={Radius.md} />
      <SkeletonList count={2} lines={4} />
    </View>
  );
}

function TopicHeader({ detail, technology, wide }: { detail: TopicDetail; technology?: string; wide: boolean }) {
  const { topic } = detail;
  return (
    <Animated.View entering={FadeIn.duration(350)}>
      <TopicCover seed={topic.id} technology={technology} height={wide ? 240 : 200} radius={Radius.xl} logoSize={wide ? 52 : 44}>
        <View style={styles.coverContent}>
          <View style={styles.badges}>
            <Badge label={`Day ${topic.dayNumber}`} tone="primary" icon="calendar" />
            <Badge label={DIFFICULTY_LABEL[topic.difficulty]} tone={DIFFICULTY_TONE[topic.difficulty]} />
            <Badge label={formatMinutes(topic.estimatedMinutes)} icon="clock" />
          </View>
          <Text variant={wide ? 'display' : 'title'} color="#FFFFFF" accessibilityRole="header">
            {topic.title}
          </Text>
        </View>
      </TopicCover>
    </Animated.View>
  );
}

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const qc = useQueryClient();
  const { isWide } = useResponsive();
  const topic = useTopic(topicId);
  const planId = topic.data?.topic.planId ?? '';
  const plan = usePlan(planId, { enabled: !!planId });
  const updateStatus = useUpdateTopicStatus();
  const [tab, setTab] = useState<Tab>('learn');
  const [toast, setToast] = useState<{ title: string; subtitle?: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const { refreshing, onRefresh } = useRefresh(() => topic.refetch());

  const detail = topic.data;
  const hideToast = useCallback(() => setToast(null), []);
  const endCelebration = useCallback(() => setCelebrate(false), []);

  const setStatus = (status: TopicStatus) => {
    if (!detail) return;
    const wasCompleted = detail.topic.status === 'completed';
    if (status === 'completed' && !wasCompleted) {
      haptics.success();
      // Is this the last unfinished topic of the plan? (read before the optimistic update lands)
      const planDetail = qc.getQueryData<PlanDetail>(queryKeys.plan(detail.topic.planId));
      const remaining = planDetail?.days.flatMap((d) => d.topics).filter((t) => t.status !== 'completed' && t.id !== detail.topic.id);
      const finishedPlan = !!planDetail && remaining?.length === 0;
      setToast({
        title: finishedPlan ? 'Plan complete!' : 'Topic complete!',
        subtitle: `+${XP_RULES.topicCompleted[detail.topic.difficulty]} XP`,
      });
      if (finishedPlan) setCelebrate(true);
    } else {
      haptics.selection();
    }
    updateStatus.mutate({ topicId: detail.topic.id, planId: detail.topic.planId, status });
  };

  return (
    <>
      <Stack.Screen options={{ title: detail ? `Day ${detail.topic.dayNumber}` : '' }} />
      <Screen refreshing={refreshing} onRefresh={onRefresh} wide={isWide} backdrop>
        {topic.isPending ? (
          <TopicSkeleton />
        ) : topic.isError ? (
          <ErrorState error={topic.error} onRetry={() => void topic.refetch()} retrying={topic.isFetching} />
        ) : (
          <View style={[styles.body, isWide && styles.wideBody]}>
            <TopicHeader detail={topic.data} technology={plan.data?.plan.technology} wide={isWide} />
            <Text tone="textSecondary">{topic.data.topic.description}</Text>
            {topic.data.topic.subtopics.length > 0 ? (
              <View style={styles.badges}>
                {topic.data.topic.subtopics.map((s) => (
                  <Badge key={s} label={s} />
                ))}
              </View>
            ) : null}

            <View style={styles.statusBlock}>
              <Text variant="overline" tone="textMuted">
                Status
              </Text>
              <SegmentedControl options={STATUS_OPTIONS} value={topic.data.topic.status} onChange={setStatus} />
              {updateStatus.isError ? <ErrorCallout error={updateStatus.error} /> : null}
            </View>

            <SegmentedControl options={TABS} value={tab} onChange={setTab} />

            {tab === 'learn' ? (
              <LearnTab detail={topic.data} onComplete={() => setStatus('completed')} wide={isWide} />
            ) : tab === 'questions' ? (
              <QuestionsTab detail={topic.data} />
            ) : (
              <QuizTab detail={topic.data} />
            )}
          </View>
        )}
      </Screen>
      <CompletionToast visible={!!toast} title={toast?.title ?? ''} subtitle={toast?.subtitle} onHide={hideToast} />
      <Celebration visible={celebrate} onDone={endCelebration} emoji="🏆" />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  wideBody: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
  },
  coverContent: {
    gap: Spacing.two,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusBlock: {
    gap: Spacing.one + 2,
  },
  gate: {
    gap: Spacing.three,
  },
  regenerate: {
    alignSelf: 'center',
  },
  lessonCard: {
    paddingVertical: Spacing.three + 4,
  },
  learnColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.four,
  },
  learnRail: {
    width: 320,
    gap: Spacing.three,
  },
  takeaways: {
    gap: Spacing.two + 2,
    borderWidth: 1,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  takeaway: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  takeawayNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  flex: {
    flex: 1,
  },
  quizCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  quizBadges: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
});
