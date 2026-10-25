"use client";

import type { InterviewQuestion } from "@preppilot/shared";
import { ArrowLeft, ArrowRight, Bookmark, RotateCw, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type KeyboardEvent } from "react";
import { Markdown } from "@/components/markdown";
import { DifficultyBadge } from "@/components/plans/plan-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface FlashcardDeckProps {
  questions: InterviewQuestion[];
  onToggleBookmark: (q: InterviewQuestion) => void;
  onRate: (q: InterviewQuestion, confidence: number | null) => void;
}

/** Flip-card study mode: question on the front, model answer on the back. */
export function FlashcardDeck({ questions, onToggleBookmark, onRate }: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const safeIndex = Math.min(index, questions.length - 1);
  const q = questions[safeIndex];
  if (!q) return null;

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setFlipped(false);
    setIndex((i) => (i + dir + questions.length) % questions.length);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5" onKeyDown={onKeyDown}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium tabular-nums text-fg-muted">
          Card {safeIndex + 1} of {questions.length}
        </span>
        <span className="text-xs text-fg-subtle">Click the card to flip · ← → to move</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {questions.map((item, i) => (
          <span
            key={item.id}
            className={cn("h-1 flex-1 rounded-full transition-colors", i <= safeIndex ? "bg-primary" : "bg-surface-muted")}
          />
        ))}
      </div>

      <div className="pp-perspective relative h-[24rem] sm:h-[26rem]">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={q.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60, rotate: direction * 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: direction * -60, rotate: direction * -2 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <motion.button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? "Show question" : "Reveal model answer"}
              aria-pressed={flipped}
              className="pp-preserve-3d relative size-full rounded-3xl text-left focus-visible:outline-offset-4"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
              {/* Front */}
              <span className="pp-backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-3xl bg-linear-to-br from-primary via-accent to-accent-3 p-6 text-white shadow-lift sm:p-8">
                <span aria-hidden className="pp-dots absolute inset-0 opacity-20" />
                <span className="relative flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{q.topicTitle}</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold capitalize backdrop-blur">
                    {q.difficulty}
                  </span>
                </span>
                <span className="relative my-auto py-6 text-xl font-semibold leading-snug text-balance sm:text-2xl">{q.question}</span>
                <span className="relative flex items-center gap-2 text-sm text-white/80">
                  <RotateCw className="size-4" aria-hidden /> Think of your answer, then flip
                </span>
              </span>
              {/* Back */}
              <span
                className="pp-backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-lift"
                style={{ transform: "rotateY(180deg)" }}
              >
                <span className="flex items-center justify-between gap-2 border-b border-border px-6 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-success-soft-fg">Model answer</span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </span>
                <span className="pp-scrollbar-thin block flex-1 overflow-y-auto px-6 py-4">
                  <Markdown size="sm">{q.answerMd}</Markdown>
                  {q.followUps.length > 0 && (
                    <span className="mt-4 block rounded-xl bg-surface-muted p-3 text-sm">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-fg-subtle">Follow-ups</span>
                      {q.followUps.map((f) => (
                        <span key={f} className="mt-1 block text-fg-muted">
                          • {f}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </span>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => go(-1)} leftIcon={<ArrowLeft className="size-4" aria-hidden />} disabled={questions.length < 2}>
          Previous
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleBookmark(q)}
            aria-pressed={q.bookmarked}
            aria-label={q.bookmarked ? "Remove bookmark" : "Bookmark question"}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl border transition-colors",
              q.bookmarked ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-fg-subtle hover:text-fg",
            )}
          >
            <Bookmark className={cn("size-4", q.bookmarked && "fill-current")} aria-hidden />
          </button>
          <div role="radiogroup" aria-label="Confidence" className="flex items-center gap-0.5 rounded-xl border border-border-strong px-1.5 py-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={q.confidence === n}
                aria-label={`Confidence ${n} of 5`}
                onClick={() => onRate(q, q.confidence === n ? null : n)}
                className="rounded-md p-1 transition-transform hover:scale-125"
              >
                <Star
                  className={cn("size-4", q.confidence !== null && n <= q.confidence ? "fill-warning text-warning" : "text-fg-subtle")}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          {q.confidence !== null && <Badge tone="warning">{q.confidence}/5</Badge>}
        </div>
        <Button onClick={() => go(1)} rightIcon={<ArrowRight className="size-4" aria-hidden />} disabled={questions.length < 2}>
          Next
        </Button>
      </div>
    </div>
  );
}
