import type { InterviewQuestion } from '@preppilot/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MarkdownView } from '@/components/markdown';
import { Badge, Card, Icon, IconButton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, QUESTION_KIND_LABEL } from '@/lib/labels';
import { useUpdateQuestion } from '@/lib/queries';

const CONFIDENCE_LABELS = ['Lost', 'Shaky', 'Okay', 'Good', 'Nailed it'];

export function ConfidenceRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.confidence}>
      <Text variant="smallStrong" tone="textSecondary">
        How confident are you?
      </Text>
      <View style={styles.confidenceRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value !== null && n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Confidence ${n} of 5: ${CONFIDENCE_LABELS[n - 1]}`}
              accessibilityState={{ selected: value === n }}
              hitSlop={4}
              onPress={() => {
                haptics.selection();
                onChange(n);
              }}
              style={[
                styles.confidenceDot,
                {
                  backgroundColor: active ? theme.primary : theme.surfaceMuted,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}>
              <Text variant="smallStrong" color={active ? theme.onPrimary : theme.textSecondary}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value ? (
        <Text variant="caption" tone="textMuted">
          {CONFIDENCE_LABELS[value - 1]}
        </Text>
      ) : null}
    </View>
  );
}

export interface QuestionCardProps {
  question: InterviewQuestion;
  /** Show which topic the question belongs to (plan-wide lists). */
  showTopic?: boolean;
  index?: number;
}

export function QuestionCard({ question, showTopic = false, index }: QuestionCardProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const update = useUpdateQuestion();

  const toggleBookmark = () => {
    update.mutate({ questionId: question.id, input: { bookmarked: !question.bookmarked } });
  };

  return (
    <Card>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityHint={open ? 'Hides the model answer' : 'Shows the model answer'}
          onPress={() => {
            haptics.selection();
            setOpen((o) => !o);
          }}
          style={styles.headerText}>
          {showTopic ? (
            <Text variant="overline" tone="primary" numberOfLines={1}>
              {question.topicTitle}
            </Text>
          ) : null}
          <Text variant="bodyStrong">
            {index !== undefined ? `${index + 1}. ` : ''}
            {question.question}
          </Text>
          <View style={styles.badges}>
            <Badge label={DIFFICULTY_LABEL[question.difficulty]} tone={DIFFICULTY_TONE[question.difficulty]} />
            <Badge label={QUESTION_KIND_LABEL[question.kind]} />
            {question.confidence ? <Badge label={`Confidence ${question.confidence}/5`} tone="primary" /> : null}
          </View>
        </Pressable>
        <IconButton
          icon={question.bookmarked ? 'bookmarkFilled' : 'bookmark'}
          color={question.bookmarked ? theme.primary : theme.textMuted}
          accessibilityLabel={question.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
          onPress={toggleBookmark}
        />
      </View>

      <Pressable
        onPress={() => {
          haptics.selection();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        style={styles.toggle}>
        <Text variant="smallStrong" tone="primary">
          {open ? 'Hide model answer' : 'Show model answer'}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} color={theme.primary} />
      </Pressable>

      {open ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.answer, { borderTopColor: theme.border }]}>
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
        </Animated.View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one + 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three - 4,
    alignSelf: 'flex-start',
  },
  answer: {
    marginTop: Spacing.three - 4,
    paddingTop: Spacing.three - 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three - 4,
  },
  followUps: {
    padding: Spacing.three - 4,
    borderRadius: Radius.md,
    gap: Spacing.one,
  },
  confidence: {
    gap: Spacing.two,
  },
  confidenceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confidenceDot: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
