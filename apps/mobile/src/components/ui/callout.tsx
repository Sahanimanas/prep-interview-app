import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing, toneColors, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface CalloutProps {
  tone?: Tone;
  icon?: IconName;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICON: Record<Tone, IconName> = {
  neutral: 'info',
  primary: 'sparkles',
  success: 'checkCircle',
  warning: 'warning',
  danger: 'error',
};

export function Callout({
  tone = 'primary',
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionLoading,
  children,
  style,
}: CalloutProps) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  return (
    <View
      accessibilityRole={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
      style={[styles.container, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      <View style={styles.row}>
        <Icon name={icon ?? DEFAULT_ICON[tone]} size={18} color={c.fg} style={styles.icon} />
        <View style={styles.body}>
          {title ? (
            <Text variant="smallStrong" color={tone === 'neutral' ? theme.text : c.fg}>
              {title}
            </Text>
          ) : null}
          {message ? (
            <Text variant="small" tone="textSecondary">
              {message}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          loading={actionLoading}
          variant={tone === 'danger' ? 'danger' : 'secondary'}
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three - 2,
    gap: Spacing.two + 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  icon: {
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  action: {
    alignSelf: 'flex-start',
    marginLeft: 28,
  },
});
