import { XP_RULES, type QuizAttemptResult, type QuizDetail, type QuizQuestion } from '@preppilot/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';

import { ErrorCallout } from '@/components/ai-callouts';
import { ProgressRing } from '@/components/gamification/progress-ring';
import { TargetIllustration, TrophyIllustration } from '@/components/illustrations';
import { Celebration } from '@/components/motion/celebration';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Float } from '@/components/motion/pulse';
import { Badge, Button, Card, ErrorState, Icon, ProgressBar, Screen, SkeletonList, Text } from '@/components/ui';
import { elevation, Radius, Spacing, toneColors } from '@/constants/theme';
import { useColorSchemeName, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { scoreTone } from '@/lib/labels';
import { useQuiz, useSubmitQuizAttempt } from '@/lib/queries';

type Mode = { kind: 'intro' } | { kind: 'taking' } | { kind: 'results'; result: QuizAttemptResult; fresh: boolean };

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CELEBRATE_AT = 80;

function sortQuestions(quiz: QuizDetail): QuizQuestion[] {
  return [...quiz.questions].sort((a, b) => a.orderIndex - b.orderIndex);
}

function OptionButton({
  index,
  label,
  selected,
  onPress,
}: {
  index: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scheme = useColorSchemeName();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      scaleTo={0.97}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[
        styles.option,
        selected ? elevation(2, scheme) : elevation(1, scheme),
        {
          backgroundColor: selected ? theme.primaryMuted : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <View style={[styles.letter, { backgroundColor: selected ? theme.primary : theme.surfaceMuted }]}>
        {selected ? (
          <Animated.View entering={ZoomIn.springify()}>
            <Icon name="check" size={16} color="#FFFFFF" />
          </Animated.View>
        ) : (
          <Text variant="smallStrong" tone="textSecondary">
            {LETTERS[index] ?? index + 1}
          </Text>
        )}
      </View>
      <Text variant="body" style={styles.flex} color={selected ? theme.primary : theme.text}>
        {label}
      </Text>
    </PressableScale>
  );
}

function Intro({ quiz, onStart, onReview }: { quiz: QuizDetail; onStart: () => void; onReview: () => void }) {
  return (
    <View style={styles.center}>
      <Float distance={8}>
        <TargetIllustration size={190} />
      </Float>
      <Text variant="title" align="center">
        {quiz.title}
      </Text>
      <View style={styles.chips}>
        <Badge label={`${quiz.questions.length} questions`} icon="quiz" tone="primary" />
        <Badge label={`+${XP_RULES.quizAttempt} XP`} icon="bolt" tone="warning" />
        {quiz.bestPercentage !== null ? (
          <Badge label={`Best ${quiz.bestPercentage}%`} tone={scoreTone(quiz.bestPercentage)} icon="star" />
        ) : null}
      </View>
      <Text tone="textSecondary" align="center">
        One question at a time. Pick an answer, or skip the ones you're unsure about — you'll see explanations at the end.
      </Text>
      <Button title={quiz.attemptCount > 0 ? 'Retake quiz' : 'Start quiz'} icon="play" size="lg" fullWidth onPress={onStart} />
      {quiz.lastAttempt ? <Button title="Review last attempt" variant="ghost" fullWidth onPress={onReview} /> : null}
    </View>
  );
}

function Results({
  quiz,
  result,
  fresh,
  onRetake,
}: {
  quiz: QuizDetail;
  result: QuizAttemptResult;
  fresh: boolean;
  onRetake: () => void;
}) {
  const theme = useTheme();
  const tone = scoreTone(result.percentage);
  const c = toneColors(theme, tone);
  const questions = sortQuestions(quiz);
  const byId = new Map(result.results.map((r) => [r.questionId, r]));
  const great = result.percentage >= CELEBRATE_AT;
  const headline = great ? 'Outstanding! 🎉' : result.percentage >= 50 ? 'Good effort 💪' : 'Keep practicing 📚';

  return (
    <View style={styles.body}>
      <Animated.View entering={FadeIn.duration(350)}>
        <Card level={2} style={styles.scoreCard}>
          {great ? <TrophyIllustration size={140} /> : <TargetIllustration size={120} />}
          <ProgressRing progress={result.percentage / 100} size={132} strokeWidth={12} colors={[c.fg, c.fg]}>
            <Text style={[styles.scoreText, { color: c.fg }]}>{result.percentage}%</Text>
          </ProgressRing>
          <Text variant="heading">{headline}</Text>
          <Text variant="small" tone="textSecondary">
            {result.score} of {result.total} correct
          </Text>
          {fresh ? (
            <Animated.View entering={ZoomIn.delay(500).springify()}>
              <Badge label={`+${XP_RULES.quizAttempt} XP earned`} tone="warning" icon="bolt" />
            </Animated.View>
          ) : null}
        </Card>
      </Animated.View>

      <Text variant="heading">Review</Text>
      {questions.map((q, i) => {
        const r = byId.get(q.id);
        if (!r) return null;
        const skipped = r.selectedIndex < 0;
        const sc = toneColors(theme, r.correct ? 'success' : skipped ? 'neutral' : 'danger');
        return (
          <Animated.View key={q.id} entering={FadeInDown.delay(Math.min(i, 10) * 60).duration(320)}>
            <Card level={1} style={[styles.reviewCard, { borderLeftColor: sc.fg }]}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewIcon, { backgroundColor: sc.bg }]}>
                  <Icon name={r.correct ? 'check' : skipped ? 'minus' : 'close'} size={14} color={sc.fg} />
                </View>
                <Text variant="bodyStrong" style={styles.flex}>
                  {i + 1}. {q.prompt}
                </Text>
              </View>
              {q.options.map((opt, oi) => {
                const isCorrect = oi === r.correctIndex;
                const isPicked = oi === r.selectedIndex;
                if (!isCorrect && !isPicked) return null;
                const oc = toneColors(theme, isCorrect ? 'success' : 'danger');
                return (
                  <View key={oi} style={[styles.reviewOption, { backgroundColor: oc.bg, borderColor: oc.border }]}>
                    <Text variant="caption" color={oc.fg}>
                      {isCorrect && isPicked ? 'Your answer · correct' : isCorrect ? 'Correct answer' : 'Your answer'}
                    </Text>
                    <Text variant="small">{opt}</Text>
                  </View>
                );
              })}
              {skipped ? (
                <Text variant="caption" tone="textMuted">
                  Skipped
                </Text>
              ) : null}
              {r.explanation ? (
                <View style={[styles.explanation, { backgroundColor: theme.surfaceMuted }]}>
                  <Icon name="lightbulb" size={14} color={theme.warning} style={styles.explIcon} />
                  <Text variant="small" tone="textSecondary" style={styles.flex}>
                    {r.explanation}
                  </Text>
                </View>
              ) : null}
            </Card>
          </Animated.View>
        );
      })}

      <View style={styles.resultActions}>
        <Button title="Retake quiz" icon="replay" variant="secondary" fullWidth onPress={onRetake} />
        <Button title="Done" variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </View>
  );
}

export default function QuizScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const scheme = useColorSchemeName();
  const quiz = useQuiz(quizId);
  const submit = useSubmitQuizAttempt(quizId);
  const [mode, setMode] = useState<Mode>({ kind: 'intro' });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  const endCelebration = useCallback(() => setCelebrate(false), []);

  const start = (q: QuizDetail) => {
    setAnswers(q.questions.map(() => -1));
    setIndex(0);
    submit.reset();
    setMode({ kind: 'taking' });
  };

  if (quiz.isPending) {
    return (
      <Screen>
        <SkeletonList count={3} lines={3} />
      </Screen>
    );
  }
  if (quiz.isError) {
    return (
      <Screen>
        <ErrorState error={quiz.error} onRetry={() => void quiz.refetch()} retrying={quiz.isFetching} />
      </Screen>
    );
  }

  const data = quiz.data;
  const questions = sortQuestions(data);

  if (questions.length === 0) {
    return (
      <Screen>
        <ErrorState title="This quiz has no questions" error={new Error('Try regenerating the quiz from the topic.')} />
      </Screen>
    );
  }

  if (mode.kind === 'intro') {
    return (
      <Screen backdrop>
        <Stack.Screen options={{ title: 'Quiz' }} />
        <Intro
          quiz={data}
          onStart={() => start(data)}
          onReview={() => data.lastAttempt && setMode({ kind: 'results', result: data.lastAttempt, fresh: false })}
        />
      </Screen>
    );
  }

  if (mode.kind === 'results') {
    return (
      <>
        <Screen backdrop>
          <Stack.Screen options={{ title: 'Results' }} />
          <Results quiz={data} result={mode.result} fresh={mode.fresh} onRetake={() => start(data)} />
        </Screen>
        <Celebration visible={celebrate} onDone={endCelebration} />
      </>
    );
  }

  const question = questions[index];
  const selected = answers[index] ?? -1;
  const isLast = index === questions.length - 1;
  const answeredCount = answers.filter((a) => a >= 0).length;

  const choose = (optionIndex: number) =>
    setAnswers((prev) => prev.map((a, i) => (i === index ? (a === optionIndex ? -1 : optionIndex) : a)));

  const doSubmit = () => {
    submit.mutate(answers, {
      onSuccess: (result) => {
        if (result.percentage >= CELEBRATE_AT) {
          haptics.success();
          setCelebrate(true);
        } else if (result.percentage >= 50) haptics.success();
        else haptics.warning();
        setMode({ kind: 'results', result, fresh: true });
      },
      onError: () => haptics.error(),
    });
  };

  const next = () => {
    if (isLast) doSubmit();
    else {
      haptics.light();
      setIndex((i) => i + 1);
    }
  };

  return (
    <Screen
      backdrop
      footer={
        <View style={styles.footer}>
          <Button
            title="Back"
            variant="outline"
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0 || submit.isPending}
            style={styles.footerSide}
          />
          <Button
            title={isLast ? 'Submit' : selected < 0 ? 'Skip' : 'Next'}
            variant={selected < 0 && !isLast ? 'secondary' : 'primary'}
            icon={isLast ? 'check' : 'arrowRight'}
            iconPosition="right"
            onPress={next}
            loading={submit.isPending}
            style={styles.footerMain}
          />
        </View>
      }>
      <Stack.Screen options={{ title: `${index + 1} of ${questions.length}` }} />
      <View style={styles.body}>
        <View style={styles.progress}>
          <View style={styles.rowBetween}>
            <Text variant="smallStrong" tone="textSecondary">
              Question {index + 1} of {questions.length}
            </Text>
            <Text variant="caption" tone="textMuted">
              {answeredCount} answered
            </Text>
          </View>
          <ProgressBar value={(index + 1) / questions.length} />
        </View>

        {question ? (
          <Animated.View key={question.id} entering={FadeInRight.duration(260)} style={styles.questionBlock}>
            <View style={[styles.questionCard, elevation(2, scheme)]}>
              <Card level={0} style={styles.questionInner}>
                <Text variant="overline" tone="primary">
                  Question {index + 1}
                </Text>
                <Text variant="heading">{question.prompt}</Text>
              </Card>
            </View>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {question.options.map((opt, oi) => (
                <Animated.View key={oi} entering={FadeInDown.delay(80 + oi * 60).duration(260)}>
                  <OptionButton index={oi} label={opt} selected={selected === oi} onPress={() => choose(oi)} />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        <ErrorCallout error={submit.error} title="Couldn't submit your answers" onRetry={doSubmit} />
        {isLast && answeredCount < questions.length ? (
          <Text variant="caption" tone="textMuted" align="center">
            {questions.length - answeredCount} unanswered question{questions.length - answeredCount === 1 ? '' : 's'} will
            count as skipped.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingTop: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  progress: {
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionBlock: {
    gap: Spacing.three,
  },
  questionCard: {
    borderRadius: Radius.xl,
  },
  questionInner: {
    borderRadius: Radius.xl,
    padding: Spacing.four - 4,
    gap: Spacing.two,
  },
  options: {
    gap: Spacing.two + 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three - 2,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  footerSide: {
    flex: 1,
  },
  footerMain: {
    flex: 2,
  },
  scoreCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  scoreText: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  reviewCard: {
    gap: Spacing.two,
    borderLeftWidth: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  reviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewOption: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two + 2,
    gap: Spacing.half,
  },
  explanation: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderRadius: Radius.sm,
  },
  explIcon: {
    marginTop: 2,
  },
  resultActions: {
    gap: Spacing.two,
  },
});
