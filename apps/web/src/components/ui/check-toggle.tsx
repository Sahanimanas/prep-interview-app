"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

interface CheckToggleProps {
  checked: boolean;
  /** Shows a half-filled "in progress" state when not checked. */
  partial?: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-6", md: "size-8", lg: "size-11" } as const;

/** Circular completion toggle with a satisfying pop + check-draw animation. */
export function CheckToggle({ checked, partial, onToggle, label, disabled, size = "md", className }: CheckToggleProps) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      whileTap={{ scale: 0.82 }}
      animate={checked ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-wait",
        SIZES[size],
        checked
          ? "border-success bg-success text-white shadow-[0_0_0_4px_color-mix(in_oklab,var(--pp-success)_18%,transparent)] dark:text-bg"
          : partial
            ? "border-primary bg-primary-soft text-primary hover:bg-primary/20"
            : "border-border-strong bg-surface text-transparent hover:border-success hover:text-success/50",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" aria-hidden>
        <AnimatePresence initial={false}>
          {checked ? (
            <motion.path
              key="on"
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          ) : partial ? (
            <circle key="partial" cx="12" cy="12" r="4" fill="currentColor" />
          ) : (
            <path key="off" d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </AnimatePresence>
      </svg>
    </motion.button>
  );
}
