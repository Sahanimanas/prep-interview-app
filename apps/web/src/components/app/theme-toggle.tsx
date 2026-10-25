"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { setThemePref, useThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** System / light / dark segmented control (persisted in localStorage). */
export function ThemeToggle({ className, showLabels = false }: { className?: string; showLabels?: boolean }) {
  const pref = useThemePref();
  const layoutId = useId();
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-xl bg-surface-muted p-1", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setThemePref(value)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              selected ? "text-fg" : "text-fg-subtle hover:text-fg",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`theme-pill-${layoutId}`}
                className="absolute inset-0 rounded-lg bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="relative size-3.5" aria-hidden />
            {showLabels && <span className="relative">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Compact icon button cycling system → light → dark (for headers). */
export function ThemeCycleButton({ className }: { className?: string }) {
  const pref = useThemePref();
  const next: ThemePref = pref === "system" ? "light" : pref === "light" ? "dark" : "system";
  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={() => setThemePref(next)}
      aria-label={`Theme: ${pref}. Switch to ${next}`}
      title={`Theme: ${pref}`}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg",
        className,
      )}
    >
      <Icon className="size-4.5" aria-hidden />
    </button>
  );
}
