"use client";

import type { PlanDetail } from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, RotateCcw, TriangleAlert } from "lucide-react";
import { SparklesIllustration } from "@/components/illustrations";
import { useEffect, useState } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

const STAGES = [
  "Reading your interview details",
  "Mapping the topics that matter most",
  "Balancing the schedule around your hours",
  "Sequencing days from fundamentals to depth",
  "Writing your strategy and tips",
] as const;

/** Animated progress UI shown while the plan is generated (the parent polls getPlan every ~3s). */
export function PlanGenerating({ detail }: { detail: PlanDetail }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card className="mx-auto w-full max-w-3xl overflow-hidden">
      <div className="pp-mesh relative px-6 py-10 text-center">
        <div className="mx-auto w-full max-w-[220px] animate-float">
          <SparklesIllustration />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-3xl">Building your prep plan</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          PrepPilot is designing a {detail.plan.totalDays}-day plan for{" "}
          <strong className="font-semibold text-fg">{detail.plan.technology}</strong> ({detail.plan.targetRole}). This
          usually takes under a minute — you can leave this page and come back.
        </p>
      </div>
      <CardContent className="flex flex-col gap-6">
        <Progress label="Generating plan" />
        <ol className="flex flex-col gap-3" aria-live="polite">
          {STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <li key={label} className={cn("flex items-center gap-3 text-sm", !done && !active && "text-fg-subtle")}>
                {done ? (
                  <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
                ) : active ? (
                  <Spinner size="md" className="text-primary" />
                ) : (
                  <span aria-hidden className="size-5 shrink-0 rounded-full border-2 border-border-strong" />
                )}
                <span className={cn(active && "font-medium text-fg")}>{label}</span>
                {done && <span className="sr-only">(done)</span>}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

export function PlanFailed({ detail }: { detail: PlanDetail }) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: () => api.retryPlan(detail.plan.id),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.plan(detail.plan.id), next);
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans() });
    },
  });
  const message = detail.plan.error ?? detail.planJob?.error ?? "The AI couldn't finish generating this plan.";

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="size-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">We couldn&apos;t generate this plan</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{message}</p>
        </div>
        {retry.isError && <ApiErrorCallout error={retry.error} title="Retry failed" className="w-full text-left" />}
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry.mutate()} loading={retry.isPending} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
            Retry generation
          </Button>
          <ButtonLink href="/dashboard" variant="outline">
            Back to dashboard
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
