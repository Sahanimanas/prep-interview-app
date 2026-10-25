import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  /** A larger illustration (from components/illustrations) shown instead of the icon. */
  illustration?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, illustration, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--pp-primary-soft),transparent_70%)]"
      />
      {illustration ? (
        <div className="relative mb-5 w-full max-w-[200px]">{illustration}</div>
      ) : (
        icon && (
          <div className="relative mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">
            {icon}
          </div>
        )
      )}
      <h3 className="relative text-lg font-semibold text-fg">{title}</h3>
      {description && <p className="relative mt-1.5 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="relative mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
