"use client";

import { motion } from "motion/react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Small count/indicator rendered after the label. */
  badge?: ReactNode;
}

interface TabListProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  /** Prefix used to link tabs to their panels. */
  idBase: string;
  label: string;
  className?: string;
}

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const panelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

/** WAI-ARIA tabs with automatic activation and arrow-key navigation. */
export function TabList<T extends string>({ items, value, onValueChange, idBase, label, className }: TabListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const focusTab = (index: number) => {
    const item = items[(index + items.length) % items.length];
    if (!item) return;
    onValueChange(item.value);
    listRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(idBase, item.value))}`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.value === value);
    if (event.key === "ArrowRight") focusTab(current + 1);
    else if (event.key === "ArrowLeft") focusTab(current - 1);
    else if (event.key === "Home") focusTab(0);
    else if (event.key === "End") focusTab(items.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="inline-flex min-w-max gap-1 rounded-2xl border border-border bg-surface-muted/70 p-1"
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              id={tabId(idBase, item.value)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(idBase, item.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-offset-[-2px]",
                selected ? "text-fg" : "text-fg-subtle hover:text-fg",
              )}
            >
              {selected && (
                <motion.span
                  layoutId={idBase + "-pill"}
                  className="absolute inset-0 rounded-xl bg-surface shadow-card ring-1 ring-border"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className={cn("relative", selected && "text-primary")}>{item.icon}</span>
              <span className="relative">{item.label}</span>
              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={cn(
                    "relative rounded-full px-1.5 py-px text-[11px] font-semibold",
                    selected ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-muted text-fg-subtle",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TabPanelProps {
  idBase: string;
  value: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ idBase, value, active, children, className }: TabPanelProps) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(idBase, value)}
      aria-labelledby={tabId(idBase, value)}
      tabIndex={0}
      className={cn("animate-fade-in pt-6 focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
