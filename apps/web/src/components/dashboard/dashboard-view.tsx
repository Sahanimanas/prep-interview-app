"use client";

import { describeDaysRemaining, type PlanSummary } from "@preppilot/shared";
import { CalendarDays, CircleCheck, Layers, Plus, Timer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { TechCover } from "@/components/art/tech-cover";
import { AiKeyMissingCallout, ApiErrorCallout } from "@/components/app/api-error-callout";
import { MotivationTicker } from "@/components/dashboard/motivation-ticker";
import { CompassIllustration, RocketIllustration } from "@/components/illustrations";
import { Reveal, Stagger, StaggerItem, TiltCard } from "@/components/motion";
import { DaysRemainingBadge } from "@/components/plans/days-remaining-badge";
import { PlanStatusBadge } from "@/components/plans/plan-status";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { usePlans } from "@/lib/queries";

export function DashboardView() {
  const user = useUser();
  const plans = usePlans();
  const firstName = user.name.split(" ")[0] ?? user.name;

  const list = plans.data ?? [];
  const ready = list.filter((p) => p.status === "ready");
  const topicsDone = ready.reduce((s, p) => s + p.progress.completedTopics, 0);
  const upcoming = ready.filter((p) => p.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero banner */}
      <Reveal>
        <section className="pp-hero-gradient relative animate-gradient overflow-hidden rounded-3xl text-white shadow-glow">
          <div aria-hidden className="pp-dots absolute inset-0 opacity-25" />
          <div aria-hidden className="absolute -left-20 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hey {firstName}, ready to level up?</h1>
              <MotivationTicker
                lead={
                  upcoming
                    ? `${upcoming.technology}: ${describeDaysRemaining(upcoming.daysRemaining).toLowerCase()}. Small steps every day add up.`
                    : "Start a prep plan and PrepPilot will map out exactly what to study each day."
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <HeroStat icon={<Layers className="size-4" aria-hidden />} label="Plans" value={list.length} />
              <HeroStat icon={<CircleCheck className="size-4" aria-hidden />} label="Topics done" value={topicsDone} />
              {upcoming && (
                <HeroStat icon={<Timer className="size-4" aria-hidden />} label="Next interview" value={`${upcoming.daysRemaining}d`} />
              )}
              <ButtonLink
                href="/plans/new"
                className="bg-white text-indigo-700 hover:bg-indigo-50 hover:shadow-lg"
                leftIcon={<Plus className="size-4" aria-hidden />}
              >
                New prep plan
              </ButtonLink>
            </div>
            <div className="-my-3 hidden w-24 shrink-0 xl:block" aria-hidden>
              <div className="animate-float">
                <RocketIllustration />
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {!user.aiAvailable && <AiKeyMissingCallout />}

      <section aria-labelledby="plans-heading" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="plans-heading" className="text-xl font-semibold tracking-tight">
              Your prep plans
            </h2>
            <p className="text-sm text-fg-subtle">Pick up where you left off.</p>
          </div>
        </div>

        {plans.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" role="status" aria-label="Loading plans">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : plans.isError ? (
          <ApiErrorCallout
            error={plans.error}
            title="Couldn't load your plans"
            onRetry={() => void plans.refetch()}
            retrying={plans.isFetching}
          />
        ) : list.length === 0 ? (
          <EmptyState
            illustration={<CompassIllustration />}
            title="No prep plans yet"
            description="Tell PrepPilot about your upcoming interview and get a personalised, day-by-day plan with learning docs, question banks, quizzes and mock interviews."
            action={
              <ButtonLink href="/plans/new" leftIcon={<Plus className="size-4" aria-hidden />}>
                Create your first plan
              </ButtonLink>
            }
          />
        ) : (
          <Stagger as="ul" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((plan) => (
              <StaggerItem as="li" key={plan.id} className="min-w-0">
                <TiltCard>
                  <PlanCard plan={plan} />
                </TiltCard>
              </StaggerItem>
            ))}
            <StaggerItem as="li" className="min-w-0">
              <Link
                href="/plans/new"
                className="group flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-strong p-6 text-center text-fg-muted transition-all hover:-translate-y-1 hover:border-primary hover:bg-primary-soft hover:text-primary-soft-fg"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-muted transition-transform group-hover:rotate-90 group-hover:bg-surface">
                  <Plus className="size-6" aria-hidden />
                </span>
                <span className="font-semibold">Prepare for another interview</span>
                <span className="text-xs text-fg-subtle">It only takes a couple of minutes</span>
              </Link>
            </StaggerItem>
          </Stagger>
        )}
      </section>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/15 px-3.5 py-2 ring-1 ring-white/20 backdrop-blur">
      <span className="text-white/80">{icon}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-xs text-white/75">{label}</span>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanSummary }) {
  const { completedTopics, totalTopics } = plan.progress;
  const pct = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow hover:shadow-lift focus-within:ring-2 focus-within:ring-ring">
      <TechCover technology={plan.technology} rounded="rounded-none" className="h-36 shrink-0">
        <div className="flex h-full items-start justify-end p-3.5">
          <PlanStatusBadge status={plan.status} />
        </div>
      </TechCover>
      <div className="flex flex-1 flex-col p-5">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-primary">{plan.technology}</span>
        <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug tracking-tight">
          <Link href={`/plans/${plan.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
            {plan.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm text-fg-muted">{plan.targetRole}</p>

        <div className="mt-auto pt-5">
          {plan.status === "ready" && (
            <>
              <div className="mb-2 flex items-center justify-between text-xs text-fg-subtle">
                <span>
                  {completedTopics}/{totalTopics} topics
                </span>
                <span className="font-semibold text-fg">{Math.round(pct)}%</span>
              </div>
              <Progress value={pct} size="sm" label={`${plan.title} progress`} tone={pct >= 100 ? "success" : "gradient"} />
            </>
          )}
          {plan.status === "generating" && <Progress size="sm" label="Generating plan" />}
          {plan.status === "failed" && <p className="text-xs text-danger">Generation failed — open the plan to retry.</p>}
          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDate(plan.interviewDate)}
            </span>
            <DaysRemainingBadge days={plan.daysRemaining} label={describeDaysRemaining(plan.daysRemaining)} />
          </div>
        </div>
      </div>
    </article>
  );
}
