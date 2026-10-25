import { cn } from "@/lib/cn";

interface SpinnerProps {
  className?: string;
  /** Accessible label; omit when the spinner is decorative (e.g. inside a labelled button). */
  label?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "size-4 border-2", md: "size-5 border-2", lg: "size-8 border-[3px]" } as const;

export function Spinner({ className, label, size = "md" }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent align-[-0.125em]",
        sizes[size],
        className,
      )}
    />
  );
}

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center text-primary">
      <Spinner size="lg" label={label} />
    </div>
  );
}
