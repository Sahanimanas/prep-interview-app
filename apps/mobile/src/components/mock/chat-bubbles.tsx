import type { MockMessage } from '@preppilot/shared';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MarkdownView } from '@/components/markdown';
import { Icon, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { scoreTone } from '@/lib/labels';

function Avatar({ role }: { role: MockMessage['role'] }) {
  const gradients = useGradients();
  const interviewer = role === 'interviewer';
  return (
    <LinearGradient
      colors={interviewer ? gradients.brand : gradients.ocean}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatar}>
      <Icon name={interviewer ? 'sparkles' : 'person'} size={15} color="#FFFFFF" />
    </LinearGradient>
  );
}

/** Animated score pill that pops in when feedback arrives. */
function ScoreChip({ score }: { score: number }) {
  const theme = useTheme();
  const gradients = useGradients();
  const tone = scoreTone(score * 10);
  const colors = tone === 'success' ? gradients.success : tone === 'warning' ? gradients.xp : ([theme.danger, theme.danger] as const);
  return (
    <Animated.View entering={ZoomIn.springify().damping(10)}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.scoreChip}>
        <Icon name="star" size={12} color="#FFFFFF" />
        <Text variant="smallStrong" color="#FFFFFF">
          {score}/10
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

function FeedbackPanel({ message }: { message: MockMessage }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const feedback = message.feedback;
  if (!feedback) return null;
  return (
    <View style={[styles.feedback, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptics.selection();
          setOpen((o) => !o);
        }}
        style={styles.feedbackHeader}>
        <ScoreChip score={feedback.score} />
        <Text variant="smallStrong" tone="textSecondary" style={styles.flex}>
          Feedback — tap to {open ? 'hide' : 'see why'}
        </Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} color={theme.textMuted} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.feedbackBody}>
          <Text variant="small">{feedback.comment}</Text>
          {feedback.idealAnswer ? (
            <View style={[styles.ideal, { backgroundColor: theme.successMuted, borderColor: theme.successBorder }]}>
              <Text variant="caption" tone="success">
                A strong answer would cover
              </Text>
              <MarkdownView compact>{feedback.idealAnswer}</MarkdownView>
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

export function ChatBubble({ message, sending = false }: { message: MockMessage; sending?: boolean }) {
  const theme = useTheme();
  const interviewer = message.role === 'interviewer';
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={[styles.row, interviewer ? styles.rowStart : styles.rowEnd]}>
      {interviewer ? <Avatar role="interviewer" /> : null}
      <View style={[styles.column, interviewer ? styles.columnStart : styles.columnEnd]}>
        <View
          style={[
            styles.bubble,
            interviewer
              ? { backgroundColor: theme.surface, borderColor: theme.border, borderTopLeftRadius: 4 }
              : { backgroundColor: theme.primary, borderColor: theme.primary, borderTopRightRadius: 4 },
            sending && styles.sending,
          ]}>
          {interviewer ? (
            <MarkdownView compact>{message.content}</MarkdownView>
          ) : (
            <Text variant="body" color={theme.onPrimary} selectable>
              {message.content}
            </Text>
          )}
        </View>
        {!interviewer && message.feedback ? <FeedbackPanel message={message} /> : null}
      </View>
      {!interviewer ? <Avatar role="candidate" /> : null}
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const theme = useTheme();
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1),
    );
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }, style]} />;
}

export function ThinkingBubble({ label = 'Interviewer is thinking…' }: { label?: string }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.row, styles.rowStart]} accessibilityLiveRegion="polite">
      <Avatar role="interviewer" />
      <View style={[styles.bubble, styles.thinking, { backgroundColor: theme.surface, borderColor: theme.border, borderTopLeftRadius: 4 }]}>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
        <Text variant="small" tone="textSecondary">
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  rowStart: {
    justifyContent: 'flex-start',
    paddingRight: Spacing.five,
  },
  rowEnd: {
    justifyContent: 'flex-end',
    paddingLeft: Spacing.five,
  },
  column: {
    flexShrink: 1,
    gap: Spacing.one + 2,
  },
  columnStart: {
    alignItems: 'flex-start',
  },
  columnEnd: {
    alignItems: 'flex-end',
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubble: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two + 2,
    maxWidth: '100%',
  },
  sending: {
    opacity: 0.7,
  },
  feedback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.two + 2,
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  feedbackBody: {
    gap: Spacing.two,
  },
  ideal: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two + 2,
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
