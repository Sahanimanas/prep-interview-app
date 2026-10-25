import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CalloutTone = "info" | "success" | "warning" | "danger";

const tones: Record<CalloutTone, { box: string; icon: ReactNode }> = {
  info: {
    box: "border-primary/25 bg-primary-soft text-primary-soft-fg",
    icon: <Info aria-hidden className="size-5" />,
  },
  success: {
    box: "border-success/25 bg-success-soft text-success-soft-fg",
    icon: <CircleCheck aria-hidden className="size-5" />,
  },
  warning: {
    box: "border-warning/30 bg-warning-soft text-warning-soft-fg",
    icon: <TriangleAlert aria-hidden className="size-5" />,
  },
  danger: {
    box: "border-danger/25 bg-danger-soft text-danger-soft-fg",
    icon: <CircleAlert aria-hidden className="size-5" />,
  },
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Callout({ tone = "info", title, children, action, icon, className }: CalloutProps) {
  const t = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
        t.box,
        className,
      )}
    >
      <div className="flex min-w-0 gap-3">
        <span className="mt-px shrink-0">{icon ?? t.icon}</span>
        <div className="min-w-0 text-sm">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cn("opacity-90", title && "mt-0.5")}>{children}</div>}
        </div>
      </div>
      {action && <div className="flex shrink-0 gap-2 pl-8 sm:pl-0">{action}</div>}
    </div>
  );
}
