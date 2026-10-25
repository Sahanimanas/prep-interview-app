import type { InterviewQuestion } from '@preppilot/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FlashcardDeck } from '@/components/flashcards';
import { QuestionCard } from '@/components/question-card';
import { SegmentedControl, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

type Mode = 'list' | 'cards';
const MODES = [
  { value: 'list', label: 'List' },
  { value: 'cards', label: 'Flashcards' },
] as const;

/** Interview questions with a List / Flashcards toggle. */
export function QuestionStudy({
  questions,
  showTopic = false,
  numbered = false,
}: {
  questions: InterviewQuestion[];
  showTopic?: boolean;
  numbered?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('list');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="caption" tone="textMuted">
          {questions.length} question{questions.length === 1 ? '' : 's'}
        </Text>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} style={styles.toggle} />
      </View>
      {mode === 'cards' ? (
        <FlashcardDeck questions={questions} showTopic={showTopic} />
      ) : (
        <View style={styles.list}>
          {questions.map((q, i) => (
            <Animated.View
              key={q.id}
              entering={FadeInDown.delay(Math.min(i, 10) * 50).duration(320)}>
              <QuestionCard question={q} showTopic={showTopic} index={numbered ? i : undefined} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three - 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  toggle: {
    width: 220,
  },
  list: {
    gap: Spacing.three - 4,
  },
});
