"use client";

import { formatMinutes, type PlanDetail, type PlanDay, type TopicSummary } from "@preppilot/shared";
import { BookOpen, Check, ChevronRight, Clock, ListChecks, MessagesSquare } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { CoverArt } from "@/components/art/cover-art";
import { Badge } from "@/components/ui/badge";
import { CheckToggle } from "@/components/ui/check-toggle";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";
import { useUpdateTopicStatus } from "@/lib/mutations";
import { DifficultyBadge, TOPIC_STATUS_LABELS } from "./plan-status";

type DayState = "done" | "today" | "missed" | "upcoming";

function dayState(day: PlanDay, today: number, interviewPassed: boolean): DayState {
  const done = day.topics.length > 0 && day.topics.every((t) => t.status === "completed");
  if (done) return "done";
  if (day.dayNumber === today && !interviewPassed) return "today";
  if (day.dayNumber < today || interviewPassed) return "missed";
  return "upcoming";
}

function DayNode({ state, dayNumber }: { state: DayState; dayNumber: number }) {
  return (
    <span
      className={cn(
        "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
        state === "done" && "border-success bg-success text-white dark:text-bg",
        state === "today" && "animate-pulse-ring border-primary bg-primary text-primary-fg",
        state === "missed" && "border-warning bg-warning-soft text-warning-soft-fg",
        state === "upcoming" && "border-border-strong bg-surface text-fg-subtle",
      )}
      aria-hidden
    >
      {state === "done" ? <Check className="size-5" strokeWidth={3} /> : dayNumber}
    </span>
  );
}

function TopicRow({ planId, topic }: { planId: string; topic: TopicSummary }) {
  const update = useUpdateTopicStatus(planId);
  const completed = topic.status === "completed";
  return (
    <li className="group relative flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-muted sm:gap-4">
      <CheckToggle
        checked={completed}
        partial={topic.status === "in_progress"}
        label={completed ? `Mark "${topic.title}" as not started` : `Mark "${topic.title}" as completed`}
        disabled={update.isPending}
        className="z-10"
        onToggle={() => update.mutate({ topicId: topic.id, status: completed ? "not_started" : "completed" })}
      />
      <CoverArt seed={topic.id + topic.title} className="hidden size-12 shrink-0 sm:block" rounded="rounded-xl" />
      <Link href={`/plans/${planId}/topics/${topic.id}`} className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
        <span className={cn("block font-medium leading-snug group-hover:text-primary", completed && "text-fg-muted line-through decoration-success/60")}>
          {topic.title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <DifficultyBadge difficulty={topic.difficulty} />
          <Badge tone="outline">
            <Clock className="size-3" aria-hidden /> {formatMinutes(topic.estimatedMinutes)}
          </Badge>
          {topic.status === "in_progress" && <Badge tone="primary">{TOPIC_STATUS_LABELS.in_progress}</Badge>}
          {topic.hasDoc && (
            <Badge tone="neutral" title="Learning doc ready">
              <BookOpen className="size-3" aria-hidden /> Doc
            </Badge>
          )}
          {topic.questionCount > 0 && (
            <Badge tone="neutral" title="Interview questions ready">
              <MessagesSquare className="size-3" aria-hidden /> {topic.questionCount}
            </Badge>
          )}
          {topic.hasQuiz && (
            <Badge tone="neutral" title="Quiz ready">
              <ListChecks className="size-3" aria-hidden /> Quiz
            </Badge>
          )}
        </span>
      </Link>
      <ChevronRight className="relative size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
    </li>
  );
}

/** The plan schedule as a vertical journey: day nodes on a line, today pulsing, finished days checked. */
export function ScheduleTab({ detail }: { detail: PlanDetail }) {
  const today = detail.stats.todayDayNumber;
  const passed = detail.stats.daysRemaining < 0;

  return (
    <ol className="relative flex flex-col gap-5">
      {detail.days.map((day, index) => {
        const state = dayState(day, today, passed);
        const minutes = day.topics.reduce((sum, t) => sum + t.estimatedMinutes, 0);
        const doneCount = day.topics.filter((t) => t.status === "completed").length;
        const last = index === detail.days.length - 1;
        return (
          <motion.li
            key={day.dayNumber}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            aria-current={state === "today" ? "date" : undefined}
            className="relative flex gap-3 sm:gap-5"
          >
            {/* rail */}
            <div className="relative flex flex-col items-center">
              <DayNode state={state} dayNumber={day.dayNumber} />
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-10 -bottom-5 w-0.5",
                    state === "done" ? "bg-success/60" : "bg-[repeating-linear-gradient(to_bottom,var(--pp-border-strong)_0_6px,transparent_6px_12px)]",
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 rounded-2xl border bg-surface shadow-card",
                state === "today" ? "border-primary/60 ring-1 ring-primary/40" : "border-border",
              )}
            >
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b px-4 py-3 sm:px-5",
                  state === "today" ? "border-primary/20 bg-primary-soft" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", state === "today" ? "text-primary" : "text-fg-subtle")}>
                    Day {day.dayNumber} · {formatShortDate(day.date)}
                  </p>
                  <h3 className="mt-0.5 font-semibold">{day.theme}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {state === "today" && <Badge tone="primary">Today</Badge>}
                  {state === "done" && <Badge tone="success">Complete</Badge>}
                  <span className="text-xs tabular-nums text-fg-subtle">
                    {doneCount}/{day.topics.length} · {formatMinutes(minutes)}
                  </span>
                </div>
              </div>
              <ul className="flex flex-col gap-0.5 p-2">
                {day.topics.map((topic) => (
                  <TopicRow key={topic.id} planId={detail.plan.id} topic={topic} />
                ))}
              </ul>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
