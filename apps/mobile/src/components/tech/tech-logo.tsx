import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { CoverPalettes, elevation } from '@/constants/theme';
import { useColorSchemeName } from '@/hooks/use-theme';
import { hashString } from '@/lib/seed';

import { TECH_ICONS, type TechIcon } from './tech-icons.generated';

/** Finds the brand icon whose pattern matches earliest in the free-text technology. */
export function matchTech(technology: string): TechIcon | null {
  const text = technology.trim();
  if (!text) return null;
  let best: { icon: TechIcon; index: number } | null = null;
  for (const icon of TECH_ICONS) {
    const m = icon.pattern.exec(text);
    if (m && (best === null || m.index < best.index)) best = { icon, index: m.index };
  }
  return best?.icon ?? null;
}

function monogram(technology: string): string {
  const words = technology
    .replace(/[^A-Za-z0-9+#. ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return (words[0] ?? '?').slice(0, 2).toUpperCase();
  return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase();
}

export interface TechLogoProps {
  technology: string;
  size?: number;
  /** `tile` draws the logo on a rounded card; `plain` draws just the glyph. */
  variant?: 'tile' | 'plain';
  style?: StyleProp<ViewStyle>;
}

/** Brand logo for a technology (from simple-icons), with a gradient monogram fallback. */
export function TechLogo({ technology, size = 40, variant = 'tile', style }: TechLogoProps) {
  const scheme = useColorSchemeName();
  const icon = matchTech(technology);
  const radius = size * 0.28;

  if (!icon) {
    const palette = CoverPalettes[hashString(technology.toLowerCase()) % CoverPalettes.length] ?? CoverPalettes[0];
    return (
      <LinearGradient
        colors={palette ?? ['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        accessibilityLabel={technology}
        style={[{ width: size, height: size, borderRadius: radius }, styles.center, style]}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.36, lineHeight: size * 0.42 }}>
          {monogram(technology)}
        </Text>
      </LinearGradient>
    );
  }

  const glyph = (
    <Svg width={variant === 'tile' ? size * 0.58 : size} height={variant === 'tile' ? size * 0.58 : size} viewBox="0 0 24 24">
      <Path d={icon.path} fill={`#${icon.hex}`} />
    </Svg>
  );

  if (variant === 'plain') {
    return (
      <View accessibilityLabel={icon.title} style={style}>
        {glyph}
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={icon.title}
      style={[
        styles.center,
        styles.tile,
        { width: size, height: size, borderRadius: radius },
        elevation(1, scheme),
        style,
      ]}>
      {glyph}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
});
