"use client";

import { loginSchema, registerSchema, LIMITS } from "@preppilot/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { getErrorMessage, getFieldErrors, hasErrorCode } from "@/lib/errors";
import { issuesToFieldErrors } from "@/lib/validation";

/** Only allow same-origin relative redirects. */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

function useRedirectIfAuthenticated(target: string) {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace(target);
  }, [status, router, target]);
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const expired = searchParams.get("expired") === "1";
  const { login } = useAuth();
  const router = useRouter();
  useRedirectIfAuthenticated(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data);
      router.replace(next);
    } catch (error) {
      if (hasErrorCode(error, "UNAUTHORIZED")) setFormError("That email and password combination didn't work.");
      else {
        setErrors(getFieldErrors(error));
        setFormError(getErrorMessage(error));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue your interview prep."
      footer={
        <>
          New to PrepPilot?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {expired && !formError && (
        <Callout tone="warning" className="mb-5">
          Your session expired. Please sign in again.
        </Callout>
      )}
      {formError && (
        <Callout tone="danger" className="mb-5">
          {formError}
        </Callout>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          )}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  useRedirectIfAuthenticated("/dashboard");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await register(parsed.data);
      router.replace("/plans/new");
    } catch (error) {
      if (hasErrorCode(error, "CONFLICT")) {
        setErrors({ email: "An account with this email already exists." });
      } else {
        setErrors(getFieldErrors(error));
        setFormError(getErrorMessage(error));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Get a personalised prep plan in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {formError && (
        <Callout tone="danger" className="mb-5">
          {formError}
        </Callout>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              required
            />
          )}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          )}
        </Field>
        <Field
          label="Password"
          error={errors.password}
          hint={`At least ${LIMITS.passwordMinLength} characters.`}
        >
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={LIMITS.passwordMinLength}
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}

function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-fg-muted">{subtitle}</p>
      </div>
      <Card className="rounded-2xl shadow-lift">
        <CardContent className="sm:p-8">{children}</CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>
    </Reveal>
  );
}
