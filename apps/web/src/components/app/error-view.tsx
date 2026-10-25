"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

interface ErrorViewProps {
  error: unknown;
  retry: () => void;
}

/** Shared UI for route-level error boundaries (error.tsx). */
export function ErrorView({ error, retry }: ErrorViewProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-fg-muted">{getErrorMessage(error)}</p>
      {digest && <p className="mt-2 font-mono text-xs text-fg-subtle">Reference: {digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()} leftIcon={<RefreshCw className="size-4" aria-hidden />}>
          Try again
        </Button>
        <ButtonLink href="/dashboard" variant="outline">
          Go to dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
