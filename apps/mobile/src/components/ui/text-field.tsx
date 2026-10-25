import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Adds a show/hide toggle for passwords. */
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputRef?: Ref<TextInputInstance>;
}

export function TextField({
  label,
  hint,
  error,
  secureToggle = false,
  containerStyle,
  inputRef,
  multiline,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="smallStrong" tone="textSecondary">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          { borderColor, backgroundColor: theme.surface },
          multiline && styles.multilineWrap,
        ]}>
        <TextInput
          ref={inputRef}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          multiline={multiline}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            Typography.body,
            styles.input,
            { color: theme.text },
            multiline && styles.multilineInput,
          ]}
          accessibilityLabel={label}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 48,
  },
  multilineWrap: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two + 2,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  toggle: {
    paddingHorizontal: Spacing.three - 4,
  },
});
