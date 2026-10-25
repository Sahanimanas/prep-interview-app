import { loginSchema } from '@preppilot/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { ErrorCallout } from '@/components/ai-callouts';
import { BooksIllustration } from '@/components/illustrations';
import { Float } from '@/components/motion/pulse';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getFieldErrors, hasErrorCode, issuesToFieldErrors } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      haptics.error();
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signIn(parsed.data);
      haptics.success();
    } catch (e) {
      haptics.error();
      if (hasErrorCode(e, 'UNAUTHORIZED')) {
        setFieldErrors({ password: 'Incorrect email or password' });
      } else if (hasErrorCode(e, 'VALIDATION_ERROR')) {
        setFieldErrors(getFieldErrors(e));
      } else {
        setError(e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboard backdrop contentContainerStyle={styles.narrow}>
      <View style={styles.header}>
        <Float style={styles.art}>
          <BooksIllustration size={150} />
        </Float>
        <Text variant="title" accessibilityRole="header">
          Welcome back
        </Text>
        <Text tone="textSecondary">Sign in to pick up your prep where you left off.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          inputRef={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          placeholder="Your password"
          secureToggle
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <ErrorCallout error={error} />
        <Button title="Sign in" size="lg" fullWidth loading={submitting} onPress={submit} />
        <Button
          title="New to PrepPilot? Create an account"
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/register')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  narrow: {
    maxWidth: 520,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  art: {
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
});
