import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-lg border bg-surface text-fg shadow-xs transition-colors placeholder:text-fg-subtle focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/25 disabled:cursor-not-allowed disabled:opacity-60";

export function inputClasses(invalid?: boolean, className?: string) {
  return cn(
    fieldBase,
    "h-10 px-3 text-sm",
    invalid ? "border-danger focus:border-danger focus:outline-danger/25" : "border-border-strong",
    className,
  );
}

interface InputProps extends ComponentProps<"input"> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={inputClasses(invalid, className)} {...props} />;
}

interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        "min-h-24 px-3 py-2 text-sm leading-relaxed",
        invalid ? "border-danger focus:border-danger focus:outline-danger/25" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

interface SelectProps extends ComponentProps<"select"> {
  invalid?: boolean;
}

export function Select({ className, invalid, children, ...props }: SelectProps) {
  return (
    <select aria-invalid={invalid || undefined} className={inputClasses(invalid, cn("pr-8", className))} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-fg", className)} {...props} />;
}

interface FieldProps {
  label: ReactNode;
  /** Render-prop receives the generated id and aria-describedby for the control. */
  children: (control: { id: string; "aria-describedby"?: string; invalid: boolean }) => ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  /** When the control is a group (chips, radios), render a <fieldset>/<legend> instead of <label>. */
  asGroup?: boolean;
}

/** Label + control + hint/error, wired up with ids for accessibility. */
export function Field({ label, children, hint, error, optional, className, asGroup }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const labelContent = (
    <>
      {label}
      {optional && <span className="ml-1.5 text-xs font-normal text-fg-subtle">Optional</span>}
    </>
  );

  const body = (
    <>
      {children({ id, "aria-describedby": describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </>
  );

  if (asGroup) {
    return (
      <fieldset className={cn("flex min-w-0 flex-col gap-2", className)} aria-describedby={describedBy}>
        <legend className="mb-2 text-sm font-medium text-fg">{labelContent}</legend>
        {body}
      </fieldset>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{labelContent}</Label>
      {body}
    </div>
  );
}
