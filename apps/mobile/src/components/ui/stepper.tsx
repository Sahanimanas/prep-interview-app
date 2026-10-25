import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { IconButton } from './button';
import { Text } from './text';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Formats the displayed value, e.g. `(v) => \`${v} days\``. */
  format?: (value: number) => string;
  hint?: string;
  error?: string;
}

function roundToStep(value: number, step: number): number {
  const decimals = step % 1 === 0 ? 0 : String(step).split('.')[1]?.length ?? 1;
  return Number(value.toFixed(decimals));
}

export function Stepper({ label, value, onChange, min, max, step = 1, format, hint, error }: StepperProps) {
  const theme = useTheme();
  const set = (next: number) => onChange(roundToStep(Math.min(max, Math.max(min, next)), step));
  return (
    <View style={styles.container}>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border }]}>
        <View style={styles.labelCol}>
          <Text variant="smallStrong" tone="textSecondary">
            {label}
          </Text>
          <Text variant="heading" accessibilityLiveRegion="polite">
            {format ? format(value) : String(value)}
          </Text>
        </View>
        <View style={styles.controls}>
          <IconButton
            icon="minus"
            accessibilityLabel={`Decrease ${label}`}
            onPress={() => set(value - step)}
            disabled={value <= min}
            color={theme.primary}
            style={[styles.btn, { backgroundColor: theme.primaryMuted }]}
          />
          <IconButton
            icon="add"
            accessibilityLabel={`Increase ${label}`}
            onPress={() => set(value + step)}
            disabled={value >= max}
            color={theme.primary}
            style={[styles.btn, { backgroundColor: theme.primaryMuted }]}
          />
        </View>
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two + 2,
  },
  labelCol: {
    gap: Spacing.half,
    flexShrink: 1,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  btn: {
    width: 40,
    height: 40,
  },
});
