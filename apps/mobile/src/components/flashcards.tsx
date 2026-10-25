import type { InterviewQuestion } from '@preppilot/shared';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MarkdownView } from '@/components/markdown';
import { ConfidenceRating } from '@/components/question-card';
import { TopicCover } from '@/components/tech/topic-cover';
import { Badge, Button, IconButton, ProgressBar, Text } from '@/components/ui';
import { elevation, Radius, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useColorSchemeName, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, QUESTION_KIND_LABEL } from '@/lib/labels';
import { useUpdateQuestion } from '@/lib/queries';

/** Flip-card study mode: question on the front, model answer on the back. */
export function FlashcardDeck({ questions, showTopic = false }: { questions: InterviewQuestion[]; showTopic?: boolean }) {
  const theme = useTheme();
  const scheme = useColorSchemeName();
  const reduced = useReducedMotion();
  const { isWide } = useResponsive();
  const update = useUpdateQuestion();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);

  const safeIndex = Math.min(index, Math.max(0, questions.length - 1));
  const question = questions[safeIndex];
  const height = isWide ? 460 : 400;

  useEffect(() => {
    rotation.value = reduced ? (flipped ? 180 : 0) : withTiming(flipped ? 180 : 0, { duration: 450 });
  }, [flipped, reduced, rotation]);

  const front = useAnimatedStyle(() => ({
    opacity: reduced ? (rotation.value < 90 ? 1 : 0) : 1,
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: reduced ? (rotation.value >= 90 ? 1 : 0) : 1,
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value + 180}deg` }],
  }));
  const hint = useAnimatedStyle(() => ({ opacity: interpolate(rotation.value, [0, 60], [1, 0]) }));

  if (!question) return null;

  const go = (delta: number) => {
    const next = Math.min(questions.length - 1, Math.max(0, safeIndex + delta));
    if (next === safeIndex) return;
    haptics.selection();
    rotation.value = 0;
    setFlipped(false);
    setIndex(next);
  };

  const flip = () => {
    haptics.light();
    setFlipped((f) => !f);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        <Text variant="smallStrong" tone="textSecondary">
          Card {safeIndex + 1} of {questions.length}
        </Text>
        <IconButton
          icon={question.bookmarked ? 'bookmarkFilled' : 'bookmark'}
          color={question.bookmarked ? theme.primary : theme.textMuted}
          accessibilityLabel={question.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
          onPress={() => update.mutate({ questionId: question.id, input: { bookmarked: !question.bookmarked } })}
        />
      </View>
      <ProgressBar value={(safeIndex + 1) / questions.length} height={5} />

      <View style={[styles.stage, { height }]}>
        {/* front */}
        <Animated.View
          pointerEvents={flipped ? 'none' : 'auto'}
          style={[styles.face, elevation(3, scheme), front]}>
          <Pressable accessibilityRole="button" accessibilityHint="Flips the card to show the model answer" onPress={flip} style={styles.fill}>
            <TopicCover seed={question.id} height={height} radius={Radius.xl} style={styles.fill}>
              <View style={styles.frontContent}>
                <View style={styles.badges}>
                  <Badge label={DIFFICULTY_LABEL[question.difficulty]} tone={DIFFICULTY_TONE[question.difficulty]} />
                  <Badge label={QUESTION_KIND_LABEL[question.kind]} />
                </View>
                <View style={styles.frontText}>
                  {showTopic ? (
                    <Text variant="overline" color="rgba(255,255,255,0.85)">
                      {question.topicTitle}
                    </Text>
                  ) : null}
                  <Text variant={question.question.length > 160 ? 'heading' : 'title'} color="#FFFFFF">
                    {question.question}
                  </Text>
                </View>
                <Animated.View style={[styles.tapHint, hint]}>
                  <Text variant="smallStrong" color="#FFFFFF">
                    Tap to reveal the answer
                  </Text>
                </Animated.View>
              </View>
            </TopicCover>
          </Pressable>
        </Animated.View>

        {/* back */}
        <Animated.View
          pointerEvents={flipped ? 'auto' : 'none'}
          style={[styles.face, elevation(3, scheme), { backgroundColor: theme.surface, borderColor: theme.border }, styles.backFace, back]}>
          <View style={styles.backHeader}>
            <Text variant="overline" tone="success">
              Model answer
            </Text>
            <Text variant="smallStrong" tone="primary" onPress={flip}>
              Flip back
            </Text>
          </View>
          <ScrollView style={styles.fill} contentContainerStyle={styles.backScroll} nestedScrollEnabled>
            <MarkdownView compact>{question.answerMd}</MarkdownView>
            {question.followUps.length > 0 ? (
              <View style={[styles.followUps, { backgroundColor: theme.surfaceMuted }]}>
                <Text variant="smallStrong">Likely follow-ups</Text>
                {question.followUps.map((f) => (
                  <Text key={f} variant="small" tone="textSecondary">
                    • {f}
                  </Text>
                ))}
              </View>
            ) : null}
            <ConfidenceRating
              value={question.confidence}
              onChange={(confidence) => update.mutate({ questionId: question.id, input: { confidence } })}
            />
          </ScrollView>
        </Animated.View>
      </View>

      <View style={styles.controls}>
        <Button title="Previous" icon="arrowLeft" variant="outline" onPress={() => go(-1)} disabled={safeIndex === 0} style={styles.flex} />
        <Button
          title={safeIndex === questions.length - 1 ? 'Done' : 'Next'}
          icon="arrowRight"
          iconPosition="right"
          onPress={() => go(1)}
          disabled={safeIndex === questions.length - 1}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three - 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stage: {
    marginTop: Spacing.two,
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.xl,
    backfaceVisibility: 'hidden',
  },
  backFace: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  fill: {
    flex: 1,
  },
  frontContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  frontText: {
    gap: Spacing.two,
  },
  tapHint: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backScroll: {
    gap: Spacing.three - 4,
    paddingBottom: Spacing.three,
  },
  followUps: {
    padding: Spacing.three - 4,
    borderRadius: Radius.md,
    gap: Spacing.one,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
