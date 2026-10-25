"use client";

import type { PlanDetail } from "@preppilot/shared";
import { Bookmark, GalleryVerticalEnd, List } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { BooksIllustration } from "@/components/illustrations";
import { FlashcardDeck } from "@/components/questions/flashcard-deck";
import { QuestionItem } from "@/components/questions/question-item";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateQuestion } from "@/lib/mutations";
import { useQuestions } from "@/lib/queries";
import { cn } from "@/lib/cn";

type View = "list" | "cards";

export function QuestionBankTab({ detail }: { detail: PlanDetail }) {
  const planId = detail.plan.id;
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [view, setView] = useState<View>("list");
  const filter = { bookmarked: bookmarkedOnly ? true : undefined, topicId: topicId || undefined };
  const questions = useQuestions(planId, filter);
  const update = useUpdateQuestion(planId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Show" className="flex gap-2">
          <Chip kind="radio" selected={!bookmarkedOnly} onClick={() => setBookmarkedOnly(false)}>
            All questions
          </Chip>
          <Chip kind="radio" selected={bookmarkedOnly} onClick={() => setBookmarkedOnly(true)}>
            <Bookmark className="size-3.5" aria-hidden /> Bookmarked
          </Chip>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ViewToggle value={view} onChange={setView} />
        <Select
          aria-label="Filter by topic"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="sm:w-72"
        >
          <option value="">All topics</option>
          {detail.days.map((day) => (
            <optgroup key={day.dayNumber} label={`Day ${day.dayNumber} · ${day.theme}`}>
              {day.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        </div>
      </div>

      {questions.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading questions">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : questions.isError ? (
        <ApiErrorCallout error={questions.error} title="Couldn't load questions" onRetry={() => void questions.refetch()} />
      ) : questions.data.length === 0 ? (
        <EmptyState
          illustration={<BooksIllustration />}
          title={bookmarkedOnly ? "No bookmarked questions" : "No interview questions yet"}
          description={
            bookmarkedOnly
              ? "Bookmark questions you want to revisit and they'll show up here."
              : "Open a topic from the schedule and generate its interview questions. They'll be collected here."
          }
        />
      ) : (
        view === "cards" ? (
          <FlashcardDeck
            questions={questions.data}
            onToggleBookmark={(q) => update.mutate({ id: q.id, topicId: q.topicId, patch: { bookmarked: !q.bookmarked } })}
            onRate={(q, confidence) => update.mutate({ id: q.id, topicId: q.topicId, patch: { confidence } })}
          />
        ) : (
        <>
          <p className="text-sm text-fg-subtle">
            {questions.data.length} {questions.data.length === 1 ? "question" : "questions"} · tap a question to see the
            model answer, or switch to flashcards to drill
          </p>
          <div className="flex flex-col gap-3">
            {questions.data.map((q) => (
              <QuestionItem
                key={q.id}
                question={q}
                showTopic={!topicId}
                onToggleBookmark={() =>
                  update.mutate({ id: q.id, topicId: q.topicId, patch: { bookmarked: !q.bookmarked } })
                }
                onRate={(confidence) => update.mutate({ id: q.id, topicId: q.topicId, patch: { confidence } })}
              />
            ))}
          </div>
        </>
        )
      )}
      {update.isError && <ApiErrorCallout error={update.error} title="Couldn't save that change" />}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const options: { value: View; label: string; icon: typeof List }[] = [
    { value: "list", label: "List", icon: List },
    { value: "cards", label: "Flashcards", icon: GalleryVerticalEnd },
  ];
  return (
    <div role="radiogroup" aria-label="View" className="inline-flex rounded-xl bg-surface-muted p-1">
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === v ? "text-fg" : "text-fg-subtle hover:text-fg",
          )}
        >
          {value === v && (
            <motion.span
              layoutId="qbank-view-pill"
              className="absolute inset-0 rounded-lg bg-surface shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <Icon className="relative size-4" aria-hidden />
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}
