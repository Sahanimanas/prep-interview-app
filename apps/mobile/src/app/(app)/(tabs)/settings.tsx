import { setApiKeySchema, updateProfileSchema } from '@preppilot/shared';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ErrorCallout } from '@/components/ai-callouts';
import { Badge, Button, Callout, Card, ErrorState, HeroCard, Screen, SkeletonList, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/lib/config';
import { getFieldErrors, hasErrorCode, issuesToFieldErrors } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { useDeleteApiKey, useMe, useSetApiKey, useUpdateProfile } from '@/lib/queries';
import { useAuth } from '@/providers/auth-provider';

function ProfileSection({ name, email }: { name: string; email: string }) {
  const [draft, setDraft] = useState(name);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const update = useUpdateProfile();
  const dirty = draft.trim() !== name;

  const save = () => {
    const parsed = updateProfileSchema.safeParse({ name: draft });
    if (!parsed.success) {
      setFieldError(issuesToFieldErrors(parsed.error.issues).name ?? 'Enter your name');
      return;
    }
    setFieldError(undefined);
    update.mutate(parsed.data, {
      onSuccess: () => haptics.success(),
      onError: (e) => {
        if (hasErrorCode(e, 'VALIDATION_ERROR')) setFieldError(getFieldErrors(e).name);
      },
    });
  };

  return (
    <Card style={styles.card}>
      <Text variant="subheading">Profile</Text>
      <TextField
        label="Name"
        value={draft}
        onChangeText={setDraft}
        error={fieldError}
        autoComplete="name"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      <View style={styles.readonlyRow}>
        <Text variant="smallStrong" tone="textSecondary">
          Email
        </Text>
        <Text variant="small">{email}</Text>
      </View>
      {update.isError && !hasErrorCode(update.error, 'VALIDATION_ERROR') ? <ErrorCallout error={update.error} /> : null}
      {dirty ? <Button title="Save name" size="sm" onPress={save} loading={update.isPending} /> : null}
    </Card>
  );
}

function ApiKeySection({
  hasApiKey,
  apiKeyHint,
  aiAvailable,
}: {
  hasApiKey: boolean;
  apiKeyHint: string | null;
  aiAvailable: boolean;
}) {
  const theme = useTheme();
  const [key, setKey] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const setApiKey = useSetApiKey();
  const deleteApiKey = useDeleteApiKey();

  const save = () => {
    const parsed = setApiKeySchema.safeParse({ apiKey: key });
    if (!parsed.success) {
      setFieldError(issuesToFieldErrors(parsed.error.issues).apiKey);
      haptics.error();
      return;
    }
    setFieldError(undefined);
    setApiKey.mutate(parsed.data, {
      onSuccess: () => {
        setKey('');
        haptics.success();
      },
      onError: (e) => {
        haptics.error();
        if (hasErrorCode(e, 'VALIDATION_ERROR')) setFieldError(getFieldErrors(e).apiKey);
      },
    });
  };

  const remove = () => {
    Alert.alert('Remove API key?', 'AI features will stop working unless the server provides its own key.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteApiKey.mutate(undefined, { onSuccess: () => haptics.success() }),
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <Text variant="subheading">Anthropic API key</Text>
        <Badge
          label={aiAvailable ? 'AI on' : 'AI off'}
          tone={aiAvailable ? 'success' : 'warning'}
          icon={aiAvailable ? 'checkCircle' : 'warning'}
        />
      </View>
      <Text variant="small" tone="textSecondary">
        PrepPilot uses Claude to write your plans, lessons, quizzes and mock interviews. Your key is stored
        encrypted on the server and never shown again.
      </Text>

      {hasApiKey ? (
        <View style={[styles.keyRow, { backgroundColor: theme.surfaceMuted }]}>
          <Text variant="smallStrong">Saved key</Text>
          <Text variant="small" tone="textSecondary">
            sk-ant-…{apiKeyHint ?? '••••'}
          </Text>
        </View>
      ) : !aiAvailable ? (
        <Callout tone="warning" title="No key yet" message="Add a key to unlock AI features." />
      ) : (
        <Callout
          tone="neutral"
          message="AI is currently provided by the server. You can add your own key to use your own quota."
        />
      )}

      <TextField
        label={hasApiKey ? 'Replace key' : 'API key'}
        value={key}
        onChangeText={setKey}
        error={fieldError}
        placeholder="sk-ant-..."
        autoCapitalize="none"
        autoCorrect={false}
        secureToggle
        returnKeyType="done"
        onSubmitEditing={save}
      />
      {setApiKey.isError && !hasErrorCode(setApiKey.error, 'VALIDATION_ERROR') ? (
        <ErrorCallout error={setApiKey.error} />
      ) : null}
      {deleteApiKey.isError ? <ErrorCallout error={deleteApiKey.error} /> : null}
      <View style={styles.buttonRow}>
        <Button
          title={hasApiKey ? 'Update key' : 'Save key'}
          icon="key"
          size="sm"
          onPress={save}
          loading={setApiKey.isPending}
          disabled={key.trim().length === 0}
        />
        {hasApiKey ? (
          <Button title="Remove" variant="danger" size="sm" icon="trash" onPress={remove} loading={deleteApiKey.isPending} />
        ) : null}
      </View>
    </Card>
  );
}

function ProfileAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={styles.avatar}>
      <Text variant="heading" color="#FFFFFF">
        {initials || '?'}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const me = useMe();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { refreshing, onRefresh } = useRefresh(() => me.refetch());

  const confirmSignOut = () => {
    Alert.alert('Log out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']} keyboard backdrop refreshing={refreshing} onRefresh={onRefresh}>
      <HeroCard
        eyebrow="Settings"
        title={me.data?.name ?? 'Your account'}
        subtitle={me.data?.email}
        leading={<ProfileAvatar name={me.data?.name ?? ''} />}
        style={styles.title}
      />

      {me.isPending ? (
        <SkeletonList count={2} lines={3} />
      ) : me.isError ? (
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <View style={styles.sections}>
          <ProfileSection key={me.data.name} name={me.data.name} email={me.data.email} />
          <ApiKeySection
            hasApiKey={me.data.hasApiKey}
            apiKeyHint={me.data.apiKeyHint}
            aiAvailable={me.data.aiAvailable}
          />
        </View>
      )}

      <View style={styles.footer}>
        <Button title="Log out" icon="logout" variant="outline" fullWidth onPress={confirmSignOut} loading={signingOut} />
        <Text variant="caption" tone="textMuted" align="center">
          PrepPilot v{Constants.expoConfig?.version ?? '1.0.0'} · {API_URL}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three - 4,
  },
  readonlyRow: {
    gap: Spacing.half,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three - 4,
    borderRadius: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  footer: {
    marginTop: Spacing.five,
    gap: Spacing.three - 4,
  },
});
