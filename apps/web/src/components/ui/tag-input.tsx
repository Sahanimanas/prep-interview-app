"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Chip } from "./chip";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: ReadonlyArray<string>;
  max: number;
  maxLength?: number;
  placeholder?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
}

/** Free-form tags (Enter or comma to add) plus one-click suggestion chips. */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  max,
  maxLength = 60,
  placeholder,
  invalid,
  "aria-describedby": describedBy,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const full = value.length >= max;
  const has = (tag: string) => value.some((v) => v.toLowerCase() === tag.toLowerCase());

  const add = (...raws: string[]) => {
    const next = [...value];
    for (const raw of raws) {
      const tag = raw.trim().slice(0, maxLength);
      if (!tag || next.length >= max || next.some((v) => v.toLowerCase() === tag.toLowerCase())) continue;
      next.push(tag);
    }
    if (next.length !== value.length) onChange(next);
  };

  const remaining = suggestions.filter((s) => !has(s));

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-surface px-2 py-1.5 shadow-xs focus-within:border-primary focus-within:outline-2 focus-within:outline-primary/25",
          invalid ? "border-danger" : "border-border-strong",
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary-soft py-0.5 pl-2 pr-1 text-sm font-medium text-primary-soft-fg"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="rounded p-0.5 hover:bg-primary/15"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          placeholder={full ? `Up to ${max} focus areas` : (placeholder ?? "Type and press Enter")}
          onChange={(e) => {
            const next = e.target.value;
            if (next.includes(",")) {
              add(...next.split(",").slice(0, -1));
              setDraft(next.split(",").at(-1) ?? "");
            } else setDraft(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed"
        />
      </div>
      {remaining.length > 0 && !full && (
        <div className="flex flex-wrap gap-2" aria-label="Suggestions">
          {remaining.map((s) => (
            <Chip key={s} selected={false} onClick={() => add(s)} aria-label={`Add ${s}`} className="min-h-8 px-3 py-1 text-xs">
              <Plus className="size-3" aria-hidden />
              {s}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
