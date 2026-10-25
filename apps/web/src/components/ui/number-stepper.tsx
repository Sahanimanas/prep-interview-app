"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface NumberStepperProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Unit shown after the number, e.g. "days". */
  suffix?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
  label: string;
  className?: string;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Numeric input with −/+ buttons. Typing is free-form; the value is clamped on blur. */
export function NumberStepper({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  invalid,
  label,
  className,
  "aria-describedby": describedBy,
}: NumberStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    setDraft(null);
    if (raw.trim() === "" || Number.isNaN(parsed)) return;
    onChange(clamp(roundTo(parsed, step), min, max));
  };

  const bump = (dir: 1 | -1) => {
    setDraft(null);
    onChange(clamp(Number((value + dir * step).toFixed(2)), min, max));
  };

  const buttonClass =
    "flex size-10 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div
      className={cn(
        "flex h-10 w-full max-w-56 items-stretch overflow-hidden rounded-lg border bg-surface shadow-xs focus-within:border-primary focus-within:outline-2 focus-within:outline-primary/25",
        invalid ? "border-danger" : "border-border-strong",
        className,
      )}
    >
      <button type="button" className={cn(buttonClass, "border-r border-border")} onClick={() => bump(-1)} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          aria-label={id ? undefined : label}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(e.currentTarget.value);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              bump(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              bump(-1);
            }
          }}
          className="w-12 min-w-0 bg-transparent text-center text-sm font-semibold tabular-nums text-fg outline-none"
        />
        {suffix && <span className="truncate text-sm text-fg-subtle">{suffix}</span>}
      </div>
      <button type="button" className={cn(buttonClass, "border-l border-border")} onClick={() => bump(1)} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
