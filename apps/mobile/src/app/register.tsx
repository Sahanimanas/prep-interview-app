import { LIMITS, registerSchema } from '@preppilot/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { ErrorCallout } from '@/components/ai-callouts';
import { RocketIllustration } from '@/components/illustrations';
import { Float } from '@/components/motion/pulse';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getFieldErrors, hasErrorCode, issuesToFieldErrors } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth-provider';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    setError(null);
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      haptics.error();
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signUp(parsed.data);
      haptics.success();
    } catch (e) {
      haptics.error();
      if (hasErrorCode(e, 'CONFLICT')) {
        setFieldErrors({ email: 'An account with this email already exists' });
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
          <RocketIllustration size={150} />
        </Float>
        <Text variant="title" accessibilityRole="header">
          Create your account
        </Text>
        <Text tone="textSecondary">Free to start. Your first plan is a couple of minutes away.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          error={fieldErrors.name}
          placeholder="Ada Lovelace"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          inputRef={emailRef}
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
          hint={`At least ${LIMITS.passwordMinLength} characters`}
          placeholder="Choose a password"
          secureToggle
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <ErrorCallout error={error} />
        <Button title="Create account" size="lg" fullWidth loading={submitting} onPress={submit} />
        <Button
          title="Already have an account? Sign in"
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/login')}
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
