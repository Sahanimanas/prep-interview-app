import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Typography, type ThemeColor, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  /** Theme color token; ignored when `color` is set. */
  tone?: ThemeColor;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', tone = 'text', color, align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[Typography[variant], { color: color ?? theme[tone] }, align ? { textAlign: align } : null, style]}
    />
  );
}
