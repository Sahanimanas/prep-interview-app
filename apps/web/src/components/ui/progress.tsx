"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ProgressTone = "primary" | "success" | "warning" | "danger" | "gradient";

const tones: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  gradient: "bg-linear-to-r from-primary via-accent to-accent-3",
};

interface ProgressProps {
  /** 0-100. Omit for an indeterminate bar. */
  value?: number;
  tone?: ProgressTone;
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Progress({ value, tone = "primary", label, className, size = "md" }: ProgressProps) {
  const indeterminate = value === undefined;
  const clamped = indeterminate ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-surface-muted",
        size === "sm" ? "h-1.5" : size === "lg" ? "h-3.5" : "h-2.5",
        className,
      )}
    >
      {indeterminate ? (
        <div className={cn("absolute inset-y-0 w-2/5 rounded-full animate-progress-indeterminate", tones[tone])} />
      ) : (
        <motion.div
          className={cn("h-full rounded-full", tones[tone])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  className?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "gradient";
}

const ringColors: Record<NonNullable<ProgressRingProps["tone"]>, string> = {
  primary: "var(--pp-primary)",
  success: "var(--pp-success)",
  warning: "var(--pp-warning)",
  danger: "var(--pp-danger)",
  gradient: "",
};

/** Circular progress that animates to its value. */
export function ProgressRing({ value, size = 120, stroke = 10, label, children, className, tone = "gradient" }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const gradId = `ring-${size}-${stroke}-${tone}`;
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--pp-primary)" />
            <stop offset="0.6" stopColor="var(--pp-accent)" />
            <stop offset="1" stopColor="var(--pp-accent-3)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--pp-surface-muted)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone === "gradient" ? `url(#${gradId})` : ringColors[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
