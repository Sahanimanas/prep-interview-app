import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorSchemeName, useGradients, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  /** Rendered after the title (e.g. a badge). */
  accessory?: ReactNode;
}

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; iconSize: number }> = {
  sm: { height: 38, paddingHorizontal: Spacing.three - 2, iconSize: 16 },
  md: { height: 50, paddingHorizontal: Spacing.three + 2, iconSize: 18 },
  lg: { height: 58, paddingHorizontal: Spacing.four, iconSize: 20 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
  accessory,
}: ButtonProps) {
  const theme = useTheme();
  const gradients = useGradients();
  const scheme = useColorSchemeName();
  const inactive = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.primary, fg: '#FFFFFF', border: 'transparent' },
    secondary: { bg: theme.primaryMuted, fg: theme.primary, border: theme.primaryBorder },
    outline: { bg: 'transparent', fg: theme.text, border: theme.borderStrong },
    ghost: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
    danger: { bg: theme.dangerMuted, fg: theme.danger, border: theme.dangerBorder },
    light: { bg: 'rgba(255,255,255,0.95)', fg: '#4338CA', border: 'transparent' },
    glass: { bg: 'rgba(255,255,255,0.16)', fg: '#FFFFFF', border: 'rgba(255,255,255,0.35)' },
  };
  const colors = palette[variant];
  const dims = SIZES[size];
  const radius = size === 'lg' ? Radius.md + 2 : Radius.md;

  const iconEl = icon ? <Icon name={icon} size={dims.iconSize} color={colors.fg} /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      disabled={inactive}
      scaleTo={0.96}
      onPress={() => {
        haptics.light();
        onPress?.();
      }}
      style={[
        styles.base,
        variant === 'primary' && !inactive ? elevation(2, scheme) : null,
        {
          height: dims.height,
          borderRadius: radius,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}
      <View style={[styles.content, { paddingHorizontal: dims.paddingHorizontal }]}>
        {loading ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <>
            {iconPosition === 'left' && iconEl}
            <Text
              numberOfLines={1}
              style={[size === 'sm' ? Typography.smallStrong : Typography.bodyStrong, { color: colors.fg }]}>
              {title}
            </Text>
            {iconPosition === 'right' && iconEl}
            {accessory}
          </>
        )}
      </View>
    </PressableScale>
  );
}

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, accessibilityLabel, color, size = 22, disabled, style }: IconButtonProps) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      disabled={disabled}
      scaleTo={0.85}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      style={[styles.iconButton, { opacity: disabled ? 0.4 : 1 }, style]}>
      <Icon name={icon} size={size} color={color ?? theme.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
