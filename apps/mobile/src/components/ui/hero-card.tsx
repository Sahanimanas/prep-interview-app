import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { elevation, Radius, Spacing, type GradientName } from '@/constants/theme';
import { useColorSchemeName, useGradients } from '@/hooks/use-theme';

import { Text } from './text';

export interface HeroCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Illustration / logo shown on the right (or above, when `stacked`). */
  art?: ReactNode;
  /** Left of the title (e.g. a tech logo). */
  leading?: ReactNode;
  children?: ReactNode;
  gradient?: GradientName;
  stacked?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Bold gradient header card with white type and optional artwork. */
export function HeroCard({
  eyebrow,
  title,
  subtitle,
  art,
  leading,
  children,
  gradient = 'heroStrong',
  stacked = false,
  style,
}: HeroCardProps) {
  const gradients = useGradients();
  const scheme = useColorSchemeName();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.shadow, elevation(3, scheme), style]}>
      <LinearGradient colors={gradients[gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />
        <View style={[styles.row, stacked && styles.stacked]}>
          <View style={styles.text}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            {eyebrow ? (
              <Text variant="overline" color="rgba(255,255,255,0.8)">
                {eyebrow}
              </Text>
            ) : null}
            <Text variant={title.length > 26 ? 'title' : 'display'} color="#FFFFFF" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="body" color="rgba(255,255,255,0.85)">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {art ? <View style={stacked ? styles.artStacked : styles.art}>{art}</View> : null}
        </View>
        {children ? <View style={styles.children}>{children}</View> : null}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: Radius.xl,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.four - 4,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  orbA: {
    width: 220,
    height: 220,
    right: -70,
    top: -90,
  },
  orbB: {
    width: 140,
    height: 140,
    left: -50,
    bottom: -70,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stacked: {
    flexDirection: 'column-reverse',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  leading: {
    marginBottom: Spacing.two,
  },
  art: {
    marginRight: -Spacing.two,
  },
  artStacked: {
    alignSelf: 'center',
  },
  children: {
    marginTop: Spacing.three,
    gap: Spacing.three - 4,
  },
});
