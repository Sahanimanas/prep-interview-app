import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';

import { Callout } from '@/components/ui';
import { getErrorMessage, isAiKeyMissing, isNetworkError } from '@/lib/errors';

function openSettings() {
  router.push('/settings');
}

/** Shown on Home when the server reports AI features can't run. */
export function AiUnavailableBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Callout
      tone="warning"
      icon="key"
      title="AI features are turned off"
      message="Add your Anthropic API key in Settings to generate plans, lessons, quizzes and mock interviews."
      actionLabel="Add API key"
      onAction={openSettings}
      style={style}
    />
  );
}

/**
 * Inline error for AI-backed actions. AI_KEY_MISSING (402) gets a friendly callout that links to Settings;
 * everything else shows the mapped message with an optional retry.
 */
export function ErrorCallout({
  error,
  onRetry,
  retrying,
  title,
  style,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  style?: StyleProp<ViewStyle>;
}) {
  if (!error) return null;
  if (isAiKeyMissing(error)) {
    return (
      <Callout
        tone="warning"
        icon="key"
        title="Add an Anthropic API key"
        message="This feature uses AI. Add your own Anthropic API key in Settings to continue."
        actionLabel="Open Settings"
        onAction={openSettings}
        style={style}
      />
    );
  }
  return (
    <Callout
      tone="danger"
      icon={isNetworkError(error) ? 'offline' : 'error'}
      title={title ?? (isNetworkError(error) ? "Can't reach the server" : 'Something went wrong')}
      message={getErrorMessage(error)}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      actionLoading={retrying}
      style={style}
    />
  );
}
