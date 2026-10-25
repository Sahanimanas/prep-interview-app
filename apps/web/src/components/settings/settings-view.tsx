"use client";

import { setApiKeySchema, updateProfileSchema } from "@preppilot/shared";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, KeyRound, LogOut, ShieldCheck, Trash } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth, useUser } from "@/lib/auth";
import { getFieldErrors } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { issuesToFieldErrors } from "@/lib/validation";

export function SettingsView() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileCard />
          <AppearanceCard />
          <SessionCard />
        </div>
        <ApiKeyCard />
      </div>
    </div>
  );
}

function ProfileCard() {
  const user = useUser();
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (value: string) => api.updateProfile({ name: value }),
    onSuccess: (me) => {
      setUser(me);
      setSaved(true);
    },
    onError: (err) => setError(getFieldErrors(err).name),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const parsed = updateProfileSchema.safeParse({ name });
    if (!parsed.success) {
      setError(issuesToFieldErrors(parsed.error.issues).name ?? "Enter your name");
      return;
    }
    setError(undefined);
    save.mutate(parsed.data.name);
  }

  const dirty = name.trim() !== user.name;

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Member since {formatDate(user.createdAt)}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Name" error={error}>
            {(p) => (
              <Input
                {...p}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                autoComplete="name"
                maxLength={80}
              />
            )}
          </Field>
          <Field label="Email" hint="Your email can't be changed.">
            {(p) => <Input {...p} value={user.email} readOnly disabled />}
          </Field>
          {save.isError && !error && <ApiErrorCallout error={save.error} title="Couldn't save your profile" />}
        </CardContent>
        <CardFooter className="justify-end">
          {saved && !dirty && (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-success" role="status">
              <CircleCheck className="size-4" aria-hidden /> Saved
            </span>
          )}
          <Button type="submit" loading={save.isPending} disabled={!dirty}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ApiKeyCard() {
  const user = useUser();
  const { setUser } = useAuth();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const save = useMutation({
    mutationFn: (apiKey: string) => api.setApiKey({ apiKey }),
    onSuccess: (me) => {
      setUser(me);
      setKey("");
      setJustSaved(true);
    },
    onError: (err) => setError(getFieldErrors(err).apiKey),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteApiKey(),
    onSuccess: (me) => {
      setUser(me);
      setRemoveOpen(false);
      setJustSaved(false);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJustSaved(false);
    const parsed = setApiKeySchema.safeParse({ apiKey: key });
    if (!parsed.success) {
      setError(issuesToFieldErrors(parsed.error.issues).apiKey ?? "Enter a valid key");
      return;
    }
    setError(undefined);
    save.mutate(parsed.data.apiKey);
  }

  return (
    <Card id="api-key" className="scroll-mt-24">
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" aria-hidden /> Anthropic API key
            </CardTitle>
            {user.aiAvailable ? <Badge tone="success">AI enabled</Badge> : <Badge tone="warning">AI not configured</Badge>}
          </div>
          <CardDescription>
            PrepPilot uses Claude to generate plans, docs, quizzes and mock interviews. Add your own key to use your
            Anthropic account. It&apos;s validated, stored encrypted and never shown again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user.hasApiKey ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden />
                <div>
                  <p className="text-sm font-medium">Your key is saved</p>
                  <p className="font-mono text-xs text-fg-subtle">sk-ant-••••••••{user.apiKeyHint ?? "••••"}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                onClick={() => setRemoveOpen(true)}
                leftIcon={<Trash className="size-4" aria-hidden />}
              >
                Remove
              </Button>
            </div>
          ) : user.aiAvailable ? (
            <Callout tone="info">
              AI is currently provided by the server. Adding your own key is optional.
            </Callout>
          ) : (
            <Callout tone="warning" title="No API key configured">
              Add an Anthropic API key below to unlock AI features.
            </Callout>
          )}

          {justSaved && (
            <Callout tone="success">Key verified and saved. AI features are ready to use.</Callout>
          )}

          <Field
            label={user.hasApiKey ? "Replace key" : "API key"}
            error={error}
            hint={
              <>
                Create one in the{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Anthropic Console
                </a>
                . Keys start with <code className="font-mono">sk-ant-</code>.
              </>
            }
          >
            {(p) => (
              <Input
                {...p}
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setJustSaved(false);
                }}
                placeholder="sk-ant-..."
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            )}
          </Field>
          {save.isError && !error && <ApiErrorCallout error={save.error} title="Couldn't save that key" />}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={save.isPending} disabled={!key.trim()}>
            {save.isPending ? "Verifying…" : user.hasApiKey ? "Replace key" : "Save key"}
          </Button>
        </CardFooter>
      </form>

      <Dialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        dismissible={!remove.isPending}
        size="sm"
        title="Remove your API key?"
        description="AI features will stop working unless the server provides a key."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => remove.mutate()} loading={remove.isPending}>
              Remove key
            </Button>
          </>
        }
      >
        {remove.isError ? (
          <ApiErrorCallout error={remove.error} title="Couldn't remove the key" />
        ) : (
          <p className="text-sm text-fg-muted">You can add a new key at any time.</p>
        )}
      </Dialog>
    </Card>
  );
}

function AppearanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Follow your system theme, or pick light or dark.</CardDescription>
      </CardHeader>
      <CardContent>
        <ThemeToggle showLabels className="w-full max-w-sm" />
      </CardContent>
    </Card>
  );
}

function SessionCard() {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session</CardTitle>
        <CardDescription>Sign out of PrepPilot on this device.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          loading={pending}
          leftIcon={<LogOut className="size-4" aria-hidden />}
          onClick={async () => {
            setPending(true);
            try {
              await logout();
            } finally {
              setPending(false);
            }
          }}
        >
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
