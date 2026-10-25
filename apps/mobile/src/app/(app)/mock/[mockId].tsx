import { answerMockSchema, MOCK_TYPE_LABELS, type MockMessage } from '@preppilot/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useCallback, useContext, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type FlatListInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorCallout } from '@/components/ai-callouts';
import { ChatBubble, ThinkingBubble } from '@/components/mock/chat-bubbles';
import { Celebration } from '@/components/motion/celebration';
import { Scorecard } from '@/components/mock/scorecard';
import { Button, ErrorState, Icon, ProgressBar, Screen, SkeletonList, Text } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { useAnswerMock, useEndMock, useMock } from '@/lib/queries';

export default function MockInterviewScreen() {
  const { mockId } = useLocalSearchParams<{ mockId: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const mock = useMock(mockId);
  const answer = useAnswerMock(mockId);
  const end = useEndMock(mockId);
  const [draft, setDraft] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const listRef = useRef<FlatListInstance>(null);
  const [celebrate, setCelebrate] = useState(false);
  const endCelebration = useCallback(() => setCelebrate(false), []);
  const onCompleted = (score: number | null | undefined) => {
    haptics.success();
    if ((score ?? 0) >= 70) setCelebrate(true);
  };

  const busy = answer.isPending || end.isPending;

  const send = () => {
    const parsed = answerMockSchema.safeParse({ answer: draft });
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? 'Type your answer first');
      haptics.warning();
      return;
    }
    setValidation(null);
    const text = parsed.data.answer;
    setPendingText(text);
    setDraft('');
    haptics.light();
    answer.mutate(parsed.data, {
      onSuccess: (updated) => {
        setPendingText(null);
        if (updated.status === 'completed') onCompleted(updated.scorecard?.overallScore ?? updated.overallScore);
      },
      onError: () => {
        haptics.error();
        setPendingText(null);
        setDraft(text);
      },
    });
  };

  const confirmEnd = () => {
    Alert.alert('End interview now?', "You'll get a scorecard based on the answers so far.", [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'End interview',
        style: 'destructive',
        onPress: () =>
          end.mutate(undefined, {
            onSuccess: (updated) => onCompleted(updated.scorecard?.overallScore ?? updated.overallScore),
            onError: () => haptics.error(),
          }),
      },
    ]);
  };

  if (mock.isPending) {
    return (
      <Screen>
        <SkeletonList count={3} lines={2} />
      </Screen>
    );
  }
  if (mock.isError) {
    return (
      <Screen>
        <ErrorState error={mock.error} onRetry={() => void mock.refetch()} retrying={mock.isFetching} />
      </Screen>
    );
  }

  const data = mock.data;
  const inProgress = data.status === 'in_progress';
  const messages: MockMessage[] = pendingText
    ? [
        ...data.messages,
        { id: 'pending', role: 'candidate', content: pendingText, feedback: null, createdAt: new Date().toISOString() },
      ]
    : data.messages;

  const footer = (
    <View style={styles.listFooter}>
      {answer.isPending ? <ThinkingBubble /> : null}
      {end.isPending ? <ThinkingBubble label="Preparing your scorecard…" /> : null}
      {!inProgress && data.scorecard ? <Scorecard scorecard={data.scorecard} /> : null}
      {!inProgress && !data.scorecard ? (
        <Text variant="small" tone="textSecondary" align="center">
          This interview has ended.
        </Text>
      ) : null}
      {!inProgress ? (
        <Button
          title="Back to plan"
          variant="secondary"
          fullWidth
          onPress={() => router.back()}
          style={styles.backButton}
        />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: MOCK_TYPE_LABELS[data.type],
          headerRight: inProgress
            ? () => (
                <Pressable accessibilityRole="button" onPress={confirmEnd} disabled={busy} hitSlop={8}>
                  <Text variant="smallStrong" color={busy ? theme.textMuted : theme.danger}>
                    End
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
        <View style={[styles.progressBar, { borderBottomColor: theme.border }]}>
          <View style={styles.progressRow}>
            <Text variant="caption" tone="textSecondary">
              {inProgress ? 'In progress' : 'Completed'} · {data.answeredCount}/{data.questionCount} answered
            </Text>
            {data.topicTitles.length > 0 ? (
              <Text variant="caption" tone="textMuted" numberOfLines={1} style={styles.topics}>
                {data.topicTitles.join(', ')}
              </Text>
            ) : null}
          </View>
          <ProgressBar value={data.answeredCount / Math.max(1, data.questionCount)} height={4} />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble message={item} sending={item.id === 'pending'} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: inProgress ? Spacing.three : insets.bottom + Spacing.four },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListFooterComponent={footer}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {inProgress ? (
          <View
            style={[
              styles.inputBar,
              {
                borderTopColor: theme.border,
                backgroundColor: theme.background,
                paddingBottom: Math.max(insets.bottom, Spacing.two),
              },
            ]}>
            {answer.isError ? (
              <ErrorCallout error={answer.error} title="Your answer wasn't sent" onRetry={send} retrying={answer.isPending} />
            ) : null}
            {end.isError ? <ErrorCallout error={end.error} title="Couldn't end the interview" /> : null}
            {validation ? (
              <Text variant="caption" tone="danger">
                {validation}
              </Text>
            ) : null}
            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={(t) => {
                  setDraft(t);
                  if (validation) setValidation(null);
                }}
                placeholder={busy ? 'Waiting for the interviewer…' : 'Type your answer…'}
                placeholderTextColor={theme.textMuted}
                selectionColor={theme.primary}
                editable={!busy}
                multiline
                maxLength={8000}
                accessibilityLabel="Your answer"
                style={[
                  Typography.body,
                  styles.input,
                  { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send answer"
                accessibilityState={{ disabled: busy || draft.trim().length === 0 }}
                disabled={busy || draft.trim().length === 0}
                onPress={send}
                style={[
                  styles.send,
                  { backgroundColor: busy || draft.trim().length === 0 ? theme.surfaceMuted : theme.primary },
                ]}>
                <Icon
                  name="send"
                  size={20}
                  color={busy || draft.trim().length === 0 ? theme.textMuted : theme.onPrimary}
                />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
      <Celebration visible={celebrate} onDone={endCelebration} emoji="🏆" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  progressBar: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  topics: {
    flexShrink: 1,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  listFooter: {
    gap: Spacing.three,
  },
  backButton: {
    marginTop: Spacing.two,
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three - 2,
    paddingTop: Spacing.two + 2,
    paddingBottom: Spacing.two + 2,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
