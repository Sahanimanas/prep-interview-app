import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { elevation, Radius, Spacing } from '@/constants/theme';
import { useColorSchemeName, useTheme } from '@/hooks/use-theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Remove inner padding (e.g. for cards with full-bleed art). */
  flush?: boolean;
  muted?: boolean;
  /** Shadow depth (default 1). */
  level?: 0 | 1 | 2 | 3;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, style, flush = false, muted = false, level = 1, accessibilityLabel }: CardProps) {
  const theme = useTheme();
  const scheme = useColorSchemeName();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    elevation(muted ? 0 : level, scheme),
    {
      backgroundColor: muted ? theme.surfaceMuted : theme.surface,
      borderColor: theme.border,
      padding: flush ? 0 : Spacing.three,
    },
  ];

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={[base, style]}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
