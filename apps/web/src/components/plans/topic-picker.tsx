"use client";

import type { PlanDay } from "@preppilot/shared";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface TopicPickerProps {
  days: PlanDay[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Hard cap enforced by the API schema. */
  max: number;
  emptyLabel: string;
}

/** Checkbox list of plan topics grouped by day. An empty selection means "all topics". */
export function TopicPicker({ days, value, onChange, max, emptyLabel }: TopicPickerProps) {
  const selected = new Set(value);
  const atMax = value.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
        <span>{value.length === 0 ? emptyLabel : `${value.length} selected${atMax ? ` (max ${max})` : ""}`}</span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="font-medium text-primary hover:underline">
            Clear
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {days.map((day) => (
          <fieldset key={day.dayNumber} className="border-b border-border last:border-b-0">
            <legend className="sr-only">Day {day.dayNumber}</legend>
            <p className="sticky top-0 bg-surface-muted px-3 py-1.5 text-xs font-semibold text-fg-muted">
              Day {day.dayNumber} · {day.theme}
            </p>
            {day.topics.map((topic) => {
              const checked = selected.has(topic.id);
              const disabled = !checked && atMax;
              return (
                <label
                  key={topic.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-surface-muted",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      onChange(checked ? value.filter((id) => id !== topic.id) : [...value, topic.id])
                    }
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                      checked ? "border-primary bg-primary text-primary-fg" : "border-border-strong bg-surface",
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 truncate">{topic.title}</span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
