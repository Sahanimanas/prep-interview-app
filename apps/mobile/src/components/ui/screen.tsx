import { LinearGradient } from 'expo-linear-gradient';
import { useContext, type ReactNode, type Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, MaxWideWidth, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useGradients, useTheme } from '@/hooks/use-theme';

type Edge = 'top' | 'bottom';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /**
   * Safe-area edges this screen must pad itself.
   * Tab screens: `['top']` (the tab bar handles the bottom). Stack screens: `['bottom']` (header handles the top).
   */
  edges?: Edge[];
  padded?: boolean;
  /** Let content use the full tablet width (multi-column layouts) instead of a readable column. */
  wide?: boolean;
  /** Soft brand gradient wash behind the top of the screen. */
  backdrop?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Avoid the keyboard (forms, chat). */
  keyboard?: boolean;
  /** Sticky footer rendered below the scroll area (e.g. wizard buttons). */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: Ref<ScrollViewInstance>;
}

export function Screen({
  children,
  scroll = true,
  edges = ['bottom'],
  padded = true,
  wide = false,
  backdrop = false,
  refreshing,
  onRefresh,
  keyboard = false,
  footer,
  style,
  contentContainerStyle,
  scrollRef,
}: ScreenProps) {
  const theme = useTheme();
  const gradients = useGradients();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  // iOS scroll views adjust for safe areas / bars automatically.
  const autoInsets = Platform.OS === 'ios' && scroll;
  const padTop = edges.includes('top') && !autoInsets ? insets.top : 0;
  const padBottom = edges.includes('bottom') && !footer && !autoInsets ? insets.bottom : 0;
  const maxWidth = wide ? MaxWideWidth : MaxContentWidth;

  const inner: StyleProp<ViewStyle> = [
    padded ? { paddingHorizontal: gutter } : null,
    { paddingTop: padTop + (padded ? Spacing.three : 0), paddingBottom: padBottom + (padded ? Spacing.five : 0) },
    { width: '100%', maxWidth, alignSelf: 'center' },
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[inner, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner, contentContainerStyle]}>{children}</View>
  );

  const content = (
    <>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.background,
              paddingHorizontal: gutter,
              paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, Spacing.three) : Spacing.three,
            },
          ]}>
          <View style={[styles.footerInner, { maxWidth }]}>{footer}</View>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }, style]}>
      {backdrop ? (
        <LinearGradient
          pointerEvents="none"
          colors={[...gradients.hero, theme.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={styles.backdrop}
        />
      ) : null}
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 420,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three - 4,
  },
  footerInner: {
    width: '100%',
    alignSelf: 'center',
  },
});
