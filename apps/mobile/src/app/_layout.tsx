import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EmptyState, Text } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useColorSchemeName } from '@/hooks/use-theme';
import { API_URL } from '@/lib/config';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. fast refresh).
});

function useNavigationTheme(): Theme {
  const scheme = useColorSchemeName();
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.background,
      text: c.text,
      border: c.border,
      notification: c.danger,
    },
  };
}

function UnreachableScreen({ onRetry }: { onRetry: () => void }) {
  const c = Colors[useColorSchemeName()];
  return (
    <View style={[styles.center, { backgroundColor: c.background }]}>
      <EmptyState
        tone="danger"
        icon="offline"
        title="Can't reach PrepPilot"
        message="We couldn't connect to the server to restore your session. Check your connection and try again."
        actionLabel="Try again"
        onAction={onRetry}
      />
      <Text variant="caption" tone="textMuted" align="center">
        {API_URL}
      </Text>
    </View>
  );
}

function RootNavigator() {
  const { status, retry } = useAuth();
  const c = Colors[useColorSchemeName()];

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'loading') return null;
  if (status === 'unreachable') return <UnreachableScreen onRetry={retry} />;

  const signedIn = status === 'signedIn';
  // Auth screens live at the root (not in a group) so that when a protected route is
  // inaccessible the router falls back to a concrete screen (/welcome), not a bare group URL.
  const authHeader = {
    headerShown: true,
    headerShadowVisible: false,
    headerTintColor: c.primary,
    headerTitle: '',
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: { backgroundColor: c.background },
  };
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" options={authHeader} />
        <Stack.Screen name="register" options={authHeader} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const navTheme = useNavigationTheme();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={navTheme}>
            <RootNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
