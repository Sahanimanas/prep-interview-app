/**
 * Light / dark theme tokens for the current color scheme.
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, Gradients, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useColorSchemeName(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

/** Returns the color tokens for the active scheme. */
export function useTheme(): ThemeColors {
  return Colors[useColorSchemeName()];
}

/** Gradient stops for the active scheme. */
export function useGradients() {
  return Gradients[useColorSchemeName()];
}
