"use client";

import type { InterviewQuestion, QuestionKind } from "@preppilot/shared";
import { Bookmark, ChevronDown, Star } from "lucide-react";
import { useId, useState } from "react";
import { Markdown } from "@/components/markdown";
import { DifficultyBadge } from "@/components/plans/plan-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const KIND_LABELS: Record<QuestionKind, string> = {
  conceptual: "Conceptual",
  coding: "Coding",
  scenario: "Scenario",
  behavioral: "Behavioral",
  system_design: "System design",
};

const CONFIDENCE_LABELS = ["", "Not confident", "Shaky", "Okay", "Confident", "Nailed it"] as const;

interface QuestionItemProps {
  question: InterviewQuestion;
  index?: number;
  showTopic?: boolean;
  onToggleBookmark: () => void;
  onRate: (confidence: number | null) => void;
}

export function QuestionItem({ question, index, showTopic, onToggleBookmark, onRate }: QuestionItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <article className="rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-2 p-4 sm:gap-3 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left"
        >
          {index !== undefined && (
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-fg-muted">
              {index + 1}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug text-fg group-hover:text-primary">{question.question}</span>
            <span className="mt-2 flex flex-wrap items-center gap-1.5">
              <DifficultyBadge difficulty={question.difficulty} />
              <Badge tone="outline">{KIND_LABELS[question.kind]}</Badge>
              {showTopic && <Badge>{question.topicTitle}</Badge>}
              {question.confidence !== null && (
                <Badge tone="primary">
                  <Star className="size-3 fill-current" aria-hidden /> {question.confidence}/5
                </Badge>
              )}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn("mt-1 size-5 shrink-0 text-fg-subtle transition-transform", open && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={question.bookmarked}
          aria-label={question.bookmarked ? "Remove bookmark" : "Bookmark question"}
          className={cn(
            "shrink-0 rounded-lg p-2 transition-colors hover:bg-surface-muted",
            question.bookmarked ? "text-primary" : "text-fg-subtle hover:text-fg",
          )}
        >
          <Bookmark className={cn("size-5", question.bookmarked && "fill-current")} aria-hidden />
        </button>
      </div>

      {open && (
        <div id={panelId} className="animate-fade-in border-t border-border px-4 py-5 sm:px-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Model answer</p>
          <Markdown size="sm">{question.answerMd}</Markdown>

          {question.followUps.length > 0 && (
            <div className="mt-5 rounded-lg bg-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Likely follow-ups</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-muted">
                {question.followUps.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <ConfidenceRating value={question.confidence} onChange={onRate} />
        </div>
      )}
    </article>
  );
}

function ConfidenceRating({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const labelId = useId();
  return (
    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p id={labelId} className="text-sm font-medium">
        How confident are you?
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              title={CONFIDENCE_LABELS[n]}
              aria-label={`${n} — ${CONFIDENCE_LABELS[n]}`}
              onClick={() => onChange(selected ? null : n)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-fg"
                  : value !== null && n < value
                    ? "border-primary/40 bg-primary-soft text-primary-soft-fg"
                    : "border-border-strong text-fg-muted hover:border-fg-subtle hover:text-fg",
              )}
            >
              {n}
            </button>
          );
        })}
        {value !== null && <span className="ml-1 text-xs text-fg-subtle">{CONFIDENCE_LABELS[value as 1 | 2 | 3 | 4 | 5]}</span>}
      </div>
    </div>
  );
}
