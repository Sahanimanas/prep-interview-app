import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-shimmer rounded-lg bg-surface-muted", className)} {...props} />;
}

/** Generic page-level placeholder used as a Suspense fallback and while data loads. */
export function PageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label={label}>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
