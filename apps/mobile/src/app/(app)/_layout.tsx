import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function AppLayout() {
  const theme = useTheme();
  const sheet = {
    presentation: Platform.OS === 'web' ? ('modal' as const) : ('formSheet' as const),
    sheetAllowedDetents: [0.75, 1],
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    headerShown: true,
  };

  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="plan/new" options={{ title: 'New prep plan' }} />
      <Stack.Screen name="plan/[planId]/index" options={{ title: '' }} />
      <Stack.Screen name="plan/[planId]/revision-quiz" options={{ ...sheet, title: 'Revision quiz' }} />
      <Stack.Screen name="plan/[planId]/start-mock" options={{ ...sheet, title: 'Mock interview' }} />
      <Stack.Screen name="topic/[topicId]" options={{ title: '' }} />
      <Stack.Screen name="quiz/[quizId]" options={{ title: 'Quiz' }} />
      <Stack.Screen name="mock/[mockId]" options={{ title: 'Mock interview' }} />
    </Stack>
  );
}
