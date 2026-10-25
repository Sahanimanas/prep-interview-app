import { MOCK_TYPE_LABELS, type MockSummary, type QuizSummary } from '@preppilot/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressRing } from '@/components/gamification/progress-ring';
import { BooksIllustration, InterviewerIllustration, TargetIllustration } from '@/components/illustrations';
import { QuestionStudy } from '@/components/question-study';
import { Badge, Button, Card, Chip, ChipGroup, EmptyState, ErrorState, Icon, SkeletonList, Text } from '@/components/ui';
import { Radius, Spacing, toneColors, type GradientName } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/lib/format';
import { scoreTone } from '@/lib/labels';
import { useMocks, useQuestions, useQuizzes } from '@/lib/queries';

function GradientTile({ gradient, icon }: { gradient: GradientName; icon: 'quiz' | 'history' | 'voice' }) {
  const gradients = useGradients();
  return (
    <LinearGradient colors={gradients[gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rowIcon}>
      <Icon name={icon} size={20} color="#FFFFFF" />
    </LinearGradient>
  );
}

function ScoreRing({ value }: { value: number }) {
  const theme = useTheme();
  const c = toneColors(theme, scoreTone(value));
  return (
    <ProgressRing progress={value / 100} size={48} strokeWidth={5} colors={[c.fg, c.fg]}>
      <Text variant="caption" color={c.fg} style={styles.ringText}>
        {value}
      </Text>
    </ProgressRing>
  );
}

// ---------------------------------------------------------------- Questions

export function QuestionsSection({ planId }: { planId: string }) {
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const questions = useQuestions(planId, bookmarkedOnly ? { bookmarked: true } : {});

  return (
    <View style={styles.section}>
      <ChipGroup>
        <Chip label="All questions" selected={!bookmarkedOnly} onPress={() => setBookmarkedOnly(false)} />
        <Chip label="Bookmarked" icon="bookmarkFilled" selected={bookmarkedOnly} onPress={() => setBookmarkedOnly(true)} />
      </ChipGroup>
      {questions.isPending ? (
        <SkeletonList count={3} />
      ) : questions.isError ? (
        <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
      ) : questions.data.length === 0 ? (
        <EmptyState
          illustration={<BooksIllustration size={170} />}
          title={bookmarkedOnly ? 'No bookmarks yet' : 'No questions yet'}
          message={
            bookmarkedOnly
              ? 'Bookmark questions to build a focused revision deck.'
              : 'Open a topic from your journey and generate its interview question bank.'
          }
        />
      ) : (
        <QuestionStudy questions={questions.data} showTopic />
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Quizzes

function QuizRow({ quiz, index }: { quiz: QuizSummary; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(320)}>
      <Card onPress={() => router.push({ pathname: '/quiz/[quizId]', params: { quizId: quiz.id } })}>
        <View style={styles.row}>
          <GradientTile gradient={quiz.topicId ? 'brand' : 'ocean'} icon={quiz.topicId ? 'quiz' : 'history'} />
          <View style={styles.rowBody}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {quiz.title}
            </Text>
            <Text variant="caption" tone="textSecondary">
              {quiz.questionCount} questions · {quiz.attemptCount} attempt{quiz.attemptCount === 1 ? '' : 's'} ·{' '}
              {quiz.topicId ? 'Topic quiz' : 'Revision'}
            </Text>
          </View>
          {quiz.bestPercentage !== null ? <ScoreRing value={quiz.bestPercentage} /> : <Badge label="New" tone="primary" icon="sparkles" />}
        </View>
      </Card>
    </Animated.View>
  );
}

export function QuizzesSection({ planId }: { planId: string }) {
  const quizzes = useQuizzes(planId);
  const openRevision = () => router.push({ pathname: '/plan/[planId]/revision-quiz', params: { planId } });
  return (
    <View style={styles.section}>
      <Button title="Create revision quiz" icon="sparkles" variant="secondary" fullWidth onPress={openRevision} />
      {quizzes.isPending ? (
        <SkeletonList count={3} lines={1} />
      ) : quizzes.isError ? (
        <ErrorState error={quizzes.error} onRetry={() => void quizzes.refetch()} />
      ) : quizzes.data.length === 0 ? (
        <EmptyState
          illustration={<TargetIllustration size={160} />}
          title="No quizzes yet"
          message="Generate a quiz from any topic, or create a revision quiz that mixes topics you've studied."
        />
      ) : (
        <View style={styles.list}>
          {quizzes.data.map((q, i) => (
            <QuizRow key={q.id} quiz={q} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- Mocks

function MockRow({ mock, index }: { mock: MockSummary; index: number }) {
  const completed = mock.status === 'completed';
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(320)}>
      <Card onPress={() => router.push({ pathname: '/mock/[mockId]', params: { mockId: mock.id } })}>
        <View style={styles.row}>
          <GradientTile gradient={completed ? 'success' : 'warm'} icon="voice" />
          <View style={styles.rowBody}>
            <Text variant="bodyStrong">{MOCK_TYPE_LABELS[mock.type]}</Text>
            <Text variant="caption" tone="textSecondary">
              {formatShortDate(mock.createdAt)} · {mock.answeredCount}/{mock.questionCount} answered
            </Text>
          </View>
          {completed && mock.overallScore !== null ? (
            <ScoreRing value={mock.overallScore} />
          ) : (
            <Badge label={completed ? 'Completed' : 'In progress'} tone={completed ? 'success' : 'warning'} />
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

export function MocksSection({ planId }: { planId: string }) {
  const mocks = useMocks(planId);
  const start = () => router.push({ pathname: '/plan/[planId]/start-mock', params: { planId } });
  return (
    <View style={styles.section}>
      <Button title="Start a mock interview" icon="play" fullWidth onPress={start} />
      {mocks.isPending ? (
        <SkeletonList count={2} lines={1} />
      ) : mocks.isError ? (
        <ErrorState error={mocks.error} onRetry={() => void mocks.refetch()} />
      ) : mocks.data.length === 0 ? (
        <EmptyState
          illustration={<InterviewerIllustration size={190} />}
          title="No mock interviews yet"
          message="Practice with an AI interviewer that scores every answer and gives you a hiring-style scorecard."
        />
      ) : (
        <View style={styles.list}>
          {mocks.data.map((m, i) => (
            <MockRow key={m.id} mock={m} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three - 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
  ringText: {
    fontWeight: '800',
  },
});
