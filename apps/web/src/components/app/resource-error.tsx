import { SearchX } from "lucide-react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { isNotFound } from "@/lib/errors";

interface ResourceErrorProps {
  error: unknown;
  /** e.g. "plan", "topic" */
  resource: string;
  backHref: string;
  backLabel: string;
  onRetry: () => void;
  retrying?: boolean;
}

/** Error state for a page whose primary resource failed to load (404 gets a friendly empty state). */
export function ResourceError({ error, resource, backHref, backLabel, onRetry, retrying }: ResourceErrorProps) {
  if (isNotFound(error)) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden />}
        title={`This ${resource} doesn't exist`}
        description={`It may have been deleted, or the link is wrong.`}
        action={<ButtonLink href={backHref}>{backLabel}</ButtonLink>}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ApiErrorCallout error={error} title={`Couldn't load this ${resource}`} onRetry={onRetry} retrying={retrying} />
      <div>
        <ButtonLink href={backHref} variant="outline">
          {backLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
