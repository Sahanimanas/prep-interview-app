import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BooksIllustration } from '@/components/illustrations';
import { QuestionStudy } from '@/components/question-study';
import { Chip, EmptyState, ErrorState, Screen, SkeletonList, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePlans, useQuestions } from '@/lib/queries';

export default function BookmarksScreen() {
  const plans = usePlans();
  const readyPlans = (plans.data ?? []).filter((p) => p.status === 'ready');
  const [selected, setSelected] = useState<string | null>(null);
  const planId = selected && readyPlans.some((p) => p.id === selected) ? selected : (readyPlans[0]?.id ?? '');

  const questions = useQuestions(planId, { bookmarked: true }, !!planId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([plans.refetch(), planId ? questions.refetch() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
    }
  };

  let body: ReactNode;
  if (plans.isPending) {
    body = <SkeletonList count={3} />;
  } else if (plans.isError) {
    body = <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />;
  } else if (readyPlans.length === 0) {
    body = (
      <EmptyState
        illustration={<BooksIllustration size={190} />}
        title="Nothing saved yet"
        message="Bookmark interview questions from any plan to build your own revision list."
        actionLabel="Create a plan"
        onAction={() => router.push('/plan/new')}
      />
    );
  } else if (questions.isPending) {
    body = <SkeletonList count={3} />;
  } else if (questions.isError) {
    body = <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />;
  } else if (questions.data.length === 0) {
    body = (
      <EmptyState
        illustration={<BooksIllustration size={170} />}
        title="No bookmarks in this plan"
        message="Tap the bookmark icon on any interview question to save it here."
      />
    );
  } else {
    body = <QuestionStudy questions={questions.data} showTopic />;
  }

  return (
    <Screen edges={['top']} backdrop refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.title}>
        <Text variant="title" accessibilityRole="header">
          Saved questions
        </Text>
        <Text variant="small" tone="textSecondary">
          Your personal revision deck — flip through them as flashcards.
        </Text>
      </View>
      {readyPlans.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {readyPlans.map((p) => (
            <Chip key={p.id} label={p.title} selected={p.id === planId} onPress={() => setSelected(p.id)} />
          ))}
        </ScrollView>
      ) : null}
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.three,
    gap: Spacing.half,
  },
  chips: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
