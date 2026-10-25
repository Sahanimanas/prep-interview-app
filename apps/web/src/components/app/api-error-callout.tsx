import { KeyRound, RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { getErrorMessage, isAiKeyMissing } from "@/lib/errors";

interface ApiErrorCalloutProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/**
 * Shows an API error. `AI_KEY_MISSING` becomes a friendly "add your API key" prompt
 * linking to Settings instead of a scary error.
 */
export function ApiErrorCallout({ error, title, onRetry, retrying, className }: ApiErrorCalloutProps) {
  if (isAiKeyMissing(error)) return <AiKeyMissingCallout className={className} />;
  return (
    <Callout
      tone="danger"
      title={title ?? "Something went wrong"}
      className={className}
      action={
        onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            loading={retrying}
            leftIcon={<RefreshCw className="size-4" aria-hidden />}
          >
            Try again
          </Button>
        )
      }
    >
      {getErrorMessage(error)}
    </Callout>
  );
}

export function AiKeyMissingCallout({ className }: { className?: string }) {
  return (
    <Callout
      tone="warning"
      title="AI isn't set up yet"
      className={className}
      icon={<KeyRound aria-hidden className="size-5" />}
      action={
        <ButtonLink href="/settings#api-key" size="sm" variant="outline">
          Add API key
        </ButtonLink>
      }
    >
      PrepPilot needs an Anthropic API key to generate content. Add your own key in Settings to unlock plans, docs,
      quizzes and mock interviews.
    </Callout>
  );
}
