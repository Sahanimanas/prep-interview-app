import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Show a trailing ✕ (for removable chips). */
  onRemove?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, icon, onRemove, disabled, style }: ChipProps) {
  const theme = useTheme();
  const fg = selected ? theme.primary : theme.textSecondary;
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || (!onPress && !onRemove)}
      onPress={() => {
        haptics.selection();
        if (onPress) onPress();
        else onRemove?.();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primaryMuted : theme.surface,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {selected && !icon ? <Icon name="check" size={14} color={fg} /> : null}
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text variant="smallStrong" color={fg} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <View accessibilityLabel={`Remove ${label}`}>
          <Icon name="close" size={12} color={fg} />
        </View>
      ) : null}
    </PressableScale>
  );
}

export function ChipGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
