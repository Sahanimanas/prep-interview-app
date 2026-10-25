import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends Omit<ComponentProps<"button">, "type"> {
  selected: boolean;
  /** "checkbox" for multi-select groups, "radio" for single-select groups. */
  kind?: "checkbox" | "radio";
}

/** A toggleable pill used for multi/single choice groups. */
export function Chip({ selected, kind = "checkbox", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        selected
          ? "border-primary bg-primary-soft text-primary-soft-fg"
          : "border-border-strong bg-surface text-fg-muted hover:border-fg-subtle hover:text-fg",
        className,
      )}
      {...props}
    >
      {selected && <Check className="size-3.5" aria-hidden />}
      {children}
    </button>
  );
}

interface ChipGroupProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: ReadonlyArray<T>;
  onChange: (value: T[]) => void;
  multiple?: boolean;
  label: string;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
  label,
  className,
  id,
  "aria-describedby": describedBy,
}: ChipGroupProps<T>) {
  return (
    <div
      id={id}
      role={multiple ? "group" : "radiogroup"}
      aria-label={label}
      aria-describedby={describedBy}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Chip
            key={option.value}
            kind={multiple ? "checkbox" : "radio"}
            selected={selected}
            onClick={() => {
              if (!multiple) onChange([option.value]);
              else onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value]);
            }}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}
