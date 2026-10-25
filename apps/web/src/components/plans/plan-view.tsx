"use client";

import {
  INTERVIEW_TYPE_LABELS,
  computePlanProgress,
  describeDaysRemaining,
  formatMinutes,
  type PlanDetail,
  type PlanProgressSummary,
} from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Flame,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Mic,
  Play,
  Rocket,
  Target,
  Trash,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type ReactNode } from "react";
import { CoverArt } from "@/components/art/cover-art";
import { TechCover } from "@/components/art/tech-cover";
import { TechLogo } from "@/components/art/tech-logo";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { BackLink } from "@/components/app/back-link";
import { ResourceError } from "@/components/app/resource-error";
import { Markdown } from "@/components/markdown";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress";
import { PageSkeleton } from "@/components/ui/skeleton";
import { TabList, TabPanel } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatPercent } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { usePlan } from "@/lib/queries";
import { AchievementGrid, LevelCard } from "./gamification";
import { MocksTab } from "./mocks-tab";
import { PlanFailed, PlanGenerating } from "./plan-generating";
import { DifficultyBadge, daysRemainingTone } from "./plan-status";
import { QuestionBankTab } from "./question-bank-tab";
import { QuizzesTab } from "./quizzes-tab";
import { ScheduleTab } from "./schedule-tab";

type HubTab = "schedule" | "questions" | "quizzes" | "mocks";

export function PlanView({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const plan = usePlan(planId);

  if (plan.isPending) return <PageSkeleton label="Loading plan…" />;
  if (plan.isError) {
    return (
      <ResourceError
        error={plan.error}
        resource="plan"
        backHref="/dashboard"
        backLabel="Back to dashboard"
        onRetry={() => void plan.refetch()}
        retrying={plan.isFetching}
      />
    );
  }

  const detail = plan.data;
  return (
    <>
      <title>{`${detail.plan.title} · PrepPilot`}</title>
      <div className="mb-5">
        <BackLink href="/dashboard">Dashboard</BackLink>
      </div>
      {detail.plan.status === "generating" ? (
        <PlanGenerating detail={detail} />
      ) : detail.plan.status === "failed" ? (
        <PlanFailed detail={detail} />
      ) : (
        <PlanHub detail={detail} />
      )}
    </>
  );
}

function PlanHub({ detail }: { detail: PlanDetail }) {
  const { plan, stats } = detail;
  const [tab, setTab] = useState<HubTab>("schedule");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const progress = computePlanProgress(detail);

  return (
    <div className="flex flex-col gap-8">
      {/* Banner */}
      <Reveal>
        <TechCover technology={plan.technology} logo="right" rounded="rounded-3xl" className="shadow-lift">
          <div className="bg-linear-to-t from-black/55 via-black/20 to-transparent">
            <div className="flex flex-col gap-6 p-5 pt-16 text-white sm:p-8 sm:pt-24 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-end gap-4 sm:gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{plan.technology}</span>
                    {plan.company && (
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{plan.company}</span>
                    )}
                  </div>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-balance drop-shadow-sm sm:text-4xl">{plan.title}</h1>
                  <p className="mt-1.5 text-sm text-white/85 sm:text-base">
                    {plan.targetRole} · {plan.interviewTypes.map((t) => INTERVIEW_TYPE_LABELS[t]).join(", ")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-stretch gap-2.5">
                <Countdown days={stats.daysRemaining} interviewDate={plan.interviewDate} />
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  aria-label="Delete plan"
                  title="Delete plan"
                  className="flex w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-red-500/80"
                >
                  <Trash className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </TechCover>
      </Reveal>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-8">
          <div className="xl:hidden">
            <ProgressCard detail={detail} progress={progress} compact />
          </div>
          <TodaysMission detail={detail} onOpenMocks={() => setTab("mocks")} />

          <section>
            <TabList<HubTab>
              idBase="plan-hub"
              label="Plan sections"
              value={tab}
              onValueChange={setTab}
              items={[
                { value: "schedule", label: "Journey", icon: <CalendarDays className="size-4" aria-hidden /> },
                { value: "questions", label: "Question bank", icon: <MessagesSquare className="size-4" aria-hidden /> },
                { value: "quizzes", label: "Quizzes", icon: <ListChecks className="size-4" aria-hidden /> },
                { value: "mocks", label: "Mock interviews", icon: <Mic className="size-4" aria-hidden /> },
              ]}
            />
            <TabPanel idBase="plan-hub" value="schedule" active={tab === "schedule"}>
              <ScheduleTab detail={detail} />
            </TabPanel>
            <TabPanel idBase="plan-hub" value="questions" active={tab === "questions"}>
              <QuestionBankTab detail={detail} />
            </TabPanel>
            <TabPanel idBase="plan-hub" value="quizzes" active={tab === "quizzes"}>
              <QuizzesTab detail={detail} />
            </TabPanel>
            <TabPanel idBase="plan-hub" value="mocks" active={tab === "mocks"}>
              <MocksTab detail={detail} />
            </TabPanel>
          </section>
        </div>

        {/* Right rail */}
        <aside aria-label="Progress and tips" className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-8 xl:self-start">
          <div className="hidden xl:block">
            <ProgressCard detail={detail} progress={progress} />
          </div>
          <RailCard title="Achievements" icon={<Award className="size-4" aria-hidden />}>
            <AchievementGrid achievements={progress.achievements} />
          </RailCard>
          {plan.tips.length > 0 && (
            <RailCard title="Coach's tips" icon={<Lightbulb className="size-4" aria-hidden />} tone="warning">
              <ul className="flex flex-col gap-2.5">
                {plan.tips.map((tip) => (
                  <li key={tip} className="flex gap-2.5 text-sm leading-relaxed">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" />
                    {tip}
                  </li>
                ))}
              </ul>
            </RailCard>
          )}
          {plan.summary && <StrategyCard summary={plan.summary} />}
        </aside>
      </div>

      <DeletePlanDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} planId={plan.id} title={plan.title} />
    </div>
  );
}

function RailCard({
  title,
  icon,
  children,
  tone,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: "warning";
}) {
  return (
    <Card className={cn(tone === "warning" && "border-warning/30 bg-warning-soft/50")}>
      <CardContent className="p-5 sm:p-5">
        <h2
          className={cn(
            "mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
            tone === "warning" ? "text-warning-soft-fg" : "text-fg-subtle",
          )}
        >
          {icon} {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}

function ProgressCard({
  detail,
  progress,
  compact = false,
}: {
  detail: PlanDetail;
  progress: PlanProgressSummary;
  compact?: boolean;
}) {
  const { stats, plan } = detail;
  return (
    <Card className="overflow-hidden">
      <CardContent className={cn("flex gap-5 p-5 sm:p-5", compact ? "flex-col sm:flex-row sm:items-center" : "flex-col")}>
        <div className="flex items-center gap-5">
          <ProgressRing value={progress.completionPct} size={compact ? 96 : 116} stroke={compact ? 9 : 11} label="Plan completion">
            <span className={cn("font-bold tabular-nums", compact ? "text-xl" : "text-2xl")}>{progress.completionPct}%</span>
            <span className="text-[10px] uppercase tracking-wider text-fg-subtle">complete</span>
          </ProgressRing>
          <dl className="grid flex-1 grid-cols-1 gap-2.5 text-sm">
            <MiniStat icon={<CircleCheck className="size-3.5 text-success" aria-hidden />} label="Topics">
              {stats.completedTopics}/{stats.totalTopics}
            </MiniStat>
            <MiniStat icon={<Target className="size-3.5 text-accent" aria-hidden />} label="Quiz avg">
              {formatPercent(stats.averageQuizScore)}
            </MiniStat>
            <MiniStat icon={<Trophy className="size-3.5 text-warning" aria-hidden />} label="Mocks">
              {stats.mocksCompleted}
              {stats.averageMockScore !== null && (
                <span className="font-normal text-fg-subtle"> · avg {Math.round(stats.averageMockScore)}</span>
              )}
            </MiniStat>
            <MiniStat icon={<CalendarDays className="size-3.5 text-primary" aria-hidden />} label="Today">
              Day {stats.todayDayNumber}/{plan.totalDays}
            </MiniStat>
          </dl>
        </div>
        <div className={cn(compact ? "flex-1 sm:border-l sm:border-border sm:pl-5" : "border-t border-border pt-5")}>
          <LevelCard progress={progress} compact={compact} />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-fg-subtle">
        {icon}
        {label}
      </dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function StrategyCard({ summary }: { summary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-5 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <Rocket className="size-4" aria-hidden /> Your strategy
          </span>
          <ChevronDown className={cn("size-4 text-fg-subtle transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <div className={cn("relative mt-3", !open && "max-h-40 overflow-hidden")}>
          <Markdown size="sm">{summary}</Markdown>
          {!open && (
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface to-transparent" />
          )}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-sm font-medium text-primary hover:underline">
          {open ? "Show less" : "Read the full strategy"}
        </button>
      </CardContent>
    </Card>
  );
}

/** Highlights today's topics with a big Start/Continue call to action. */
function TodaysMission({ detail, onOpenMocks }: { detail: PlanDetail; onOpenMocks: () => void }) {
  const { stats, plan } = detail;
  const passed = stats.daysRemaining < 0;
  const day = detail.days.find((d) => d.dayNumber === stats.todayDayNumber);
  const topics = day?.topics ?? [];
  const next = topics.find((t) => t.status === "in_progress") ?? topics.find((t) => t.status !== "completed");
  const allDone = topics.length > 0 && !next;
  const firstUnfinished = detail.days.flatMap((d) => d.topics).find((t) => t.status !== "completed");
  const target = next ?? firstUnfinished;
  const doneToday = topics.filter((t) => t.status === "completed").length;
  const minutesLeft = topics.filter((t) => t.status !== "completed").reduce((s, t) => s + t.estimatedMinutes, 0);

  return (
    <motion.section
      aria-labelledby="mission-heading"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/90 via-accent/80 to-accent-3/80 p-[1.5px] shadow-glow"
    >
      <div className="relative h-full rounded-[calc(1.5rem-1.5px)] bg-surface">
        <div aria-hidden className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(40rem_16rem_at_100%_0%,var(--pp-primary-soft),transparent)]" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Flame className="size-4" aria-hidden />
              {passed ? "After the interview" : `Today's mission · Day ${stats.todayDayNumber}`}
            </p>
            <h2 id="mission-heading" className="mt-2 text-2xl font-bold tracking-tight">
              {passed
                ? describeDaysRemaining(stats.daysRemaining)
                : allDone
                  ? "Day complete — brilliant work! 🎉"
                  : (day?.theme ?? "Keep going")}
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              {passed
                ? "Review what you learned, or run another mock interview to keep sharp."
                : allDone
                  ? "You've finished everything planned for today. Get ahead on tomorrow, or test yourself with a quiz."
                  : `${topics.length - doneToday} topic${topics.length - doneToday === 1 ? "" : "s"} to go · about ${formatMinutes(minutesLeft)} of focused study.`}
            </p>
            {topics.length > 0 && !passed && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/plans/${plan.id}/topics/${t.id}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        t.status === "completed"
                          ? "border-success/30 bg-success-soft text-success-soft-fg"
                          : t.id === next?.id
                            ? "border-primary/40 bg-primary-soft text-primary-soft-fg"
                            : "border-border bg-surface text-fg-muted hover:text-fg",
                      )}
                    >
                      {t.status === "completed" && <CircleCheck className="size-3.5" aria-hidden />}
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {target ? (
            <Link
              href={`/plans/${plan.id}/topics/${target.id}`}
              className="group relative block overflow-hidden rounded-2xl shadow-card transition-transform hover:-translate-y-1 hover:shadow-lift"
            >
              <CoverArt seed={target.id + target.title} rounded="rounded-2xl">
                <div className="flex min-h-40 flex-col justify-between gap-4 bg-linear-to-t from-black/60 to-black/5 p-4 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <TechLogo technology={plan.technology} size="sm" variant="glass" />
                    <DifficultyBadge difficulty={target.difficulty} />
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/75">
                        {target.status === "in_progress" ? "Continue" : allDone || target !== next ? "Up next" : "Start here"} · Day {target.dayNumber}
                      </p>
                      <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{target.title}</p>
                    </div>
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-lg transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 size-5 fill-current" aria-hidden />
                    </span>
                  </div>
                </div>
              </CoverArt>
              <span className="sr-only">{target.status === "in_progress" ? "Continue" : "Start"} {target.title}</span>
            </Link>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-2xl bg-success-soft p-5 text-success-soft-fg">
              <Trophy className="size-8" aria-hidden />
              <p className="font-semibold">Every topic is complete!</p>
              <Button size="sm" variant="outline" onClick={onOpenMocks} rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                Take a mock interview
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function Countdown({ days, interviewDate }: { days: number; interviewDate: string }) {
  const tone = daysRemainingTone(days);
  return (
    <div
      className={cn(
        "flex min-w-36 flex-col justify-center rounded-2xl bg-white/15 px-4 py-3 text-white ring-1 backdrop-blur",
        tone === "danger" ? "ring-red-300/70" : tone === "warning" ? "ring-amber-300/70" : "ring-white/25",
      )}
    >
      {days > 0 ? (
        <span className="text-3xl font-bold tabular-nums leading-none">
          {days} <span className="text-sm font-medium">{days === 1 ? "day" : "days"}</span>
        </span>
      ) : (
        <span className="text-base font-semibold leading-tight">{describeDaysRemaining(days)}</span>
      )}
      <span className="mt-1 text-xs text-white/80">
        {days > 0 ? "until " : ""}
        {formatDate(interviewDate)}
      </span>
    </div>
  );
}

function DeletePlanDialog({
  open,
  onClose,
  planId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  planId: string;
  title: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: () => api.deletePlan(planId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.plan(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans() });
      router.replace("/dashboard");
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!del.isPending}
      size="sm"
      title="Delete this plan?"
      description="This permanently deletes the plan with all its learning docs, questions, quizzes and mock interviews."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => del.mutate()} loading={del.isPending} leftIcon={<Trash className="size-4" aria-hidden />}>
            Delete plan
          </Button>
        </>
      }
    >
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium">{title}</p>
      {del.isError && <ApiErrorCallout error={del.error} title="Couldn't delete the plan" className="mt-4" />}
      <Badge tone="danger" className="mt-3">
        This can&apos;t be undone
      </Badge>
    </Dialog>
  );
}
