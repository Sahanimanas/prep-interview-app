import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { elevation, Radius, Spacing } from '@/constants/theme';
import { useColorSchemeName, useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

import { Text } from './text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

const PAD = 4;

/** Segmented control with a sliding, springy selection pill. */
export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const scheme = useColorSchemeName();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * segment, { damping: 20, stiffness: 260 });
  }, [index, segment, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.container, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }, style]}>
      {segment > 0 ? (
        <Animated.View
          style={[
            styles.pill,
            elevation(1, scheme),
            { width: segment, backgroundColor: theme.surface, borderColor: theme.border },
            pill,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={styles.segment}>
            <Text
              variant="smallStrong"
              numberOfLines={1}
              color={selected ? theme.primary : theme.textSecondary}
              align="center">
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two + 1,
    paddingHorizontal: Spacing.one,
  },
});
