import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage, isNetworkError } from '@/lib/errors';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface EmptyStateProps {
  icon?: IconName;
  /** Artwork shown instead of the icon (see components/illustrations). */
  illustration?: ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  tone?: 'primary' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = 'sparkles',
  illustration,
  title,
  message,
  actionLabel,
  onAction,
  actionLoading,
  tone = 'primary',
  style,
}: EmptyStateProps) {
  const theme = useTheme();
  const fg = tone === 'danger' ? theme.danger : theme.primary;
  const bg = tone === 'danger' ? theme.dangerMuted : theme.primaryMuted;
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, style]}>
      {illustration ? (
        <View style={styles.illustration}>{illustration}</View>
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Icon name={icon} size={28} color={fg} />
        </View>
      )}
      <Text variant="heading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="small" tone="textSecondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} loading={actionLoading} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}

/** Standard error block with a retry button. */
export function ErrorState({
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
  const offline = isNetworkError(error);
  return (
    <EmptyState
      tone="danger"
      icon={offline ? 'offline' : 'warning'}
      title={title ?? (offline ? "Can't reach the server" : 'Something went wrong')}
      message={getErrorMessage(error)}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      actionLoading={retrying}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  message: {
    maxWidth: 360,
  },
  illustration: {
    marginBottom: Spacing.two,
  },
  action: {
    marginTop: Spacing.three,
  },
});
