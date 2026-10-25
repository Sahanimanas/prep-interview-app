"use client";

import {
  LIMITS,
  MOCK_TYPES,
  MOCK_TYPE_LABELS,
  type MockSummary,
  type MockType,
  type PlanDetail,
} from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Mic, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { ChatIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useMocks } from "@/lib/queries";
import { TopicPicker } from "./topic-picker";

const MOCK_TYPE_HINTS: Record<MockType, string> = {
  technical: "Deep questions on the concepts in your plan.",
  behavioral: "STAR-style questions about your experience.",
  system_design: "Design a system and defend your trade-offs.",
  mixed: "A realistic loop mixing all of the above.",
};

export function scoreTone(score: number) {
  return score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
}

export function MocksTab({ detail }: { detail: PlanDetail }) {
  const planId = detail.plan.id;
  const mocks = useMocks(planId);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">
          Practise with an AI interviewer. Every answer is scored, and you get a full scorecard at the end.
        </p>
        <Button onClick={() => setOpen(true)} leftIcon={<Mic className="size-4" aria-hidden />}>
          Start mock interview
        </Button>
      </div>

      {mocks.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading mock interviews">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : mocks.isError ? (
        <ApiErrorCallout error={mocks.error} title="Couldn't load mock interviews" onRetry={() => void mocks.refetch()} />
      ) : mocks.data.length === 0 ? (
        <EmptyState
          illustration={<ChatIllustration />}
          title="No mock interviews yet"
          description="When you've covered a few topics, run a mock interview to practise answering under pressure."
          action={
            <Button variant="outline" onClick={() => setOpen(true)} leftIcon={<Play className="size-4" aria-hidden />}>
              Start your first mock
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {mocks.data.map((mock) => (
            <li key={mock.id}>
              <MockRow planId={planId} mock={mock} />
            </li>
          ))}
        </ul>
      )}

      <StartMockDialog open={open} onClose={() => setOpen(false)} detail={detail} />
    </div>
  );
}

function MockRow({ planId, mock }: { planId: string; mock: MockSummary }) {
  const completed = mock.status === "completed";
  return (
    <Link
      href={`/plans/${planId}/mocks/${mock.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-indigo-500 text-white shadow-md transition-transform group-hover:scale-110 group-hover:rotate-6">
        <Mic className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium group-hover:text-primary">{MOCK_TYPE_LABELS[mock.type]}</span>
        <span className="mt-1 block text-xs text-fg-subtle">
          {formatDate(mock.createdAt)} · {mock.answeredCount}/{mock.questionCount} answered
        </span>
      </span>
      {completed ? (
        mock.overallScore !== null ? (
          <Badge tone={scoreTone(mock.overallScore)} className="text-sm">
            {mock.overallScore}/100
          </Badge>
        ) : (
          <Badge tone="success">Completed</Badge>
        )
      ) : (
        <Badge tone="primary">In progress</Badge>
      )}
      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}

function StartMockDialog({ open, onClose, detail }: { open: boolean; onClose: () => void; detail: PlanDetail }) {
  const planId = detail.plan.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [type, setType] = useState<MockType>("technical");
  const [questionCount, setQuestionCount] = useState(5);
  const [topicIds, setTopicIds] = useState<string[]>([]);

  const start = useMutation({
    mutationFn: () =>
      api.createMock(planId, {
        type,
        questionCount,
        topicIds: topicIds.length > 0 ? topicIds : undefined,
      }),
    onSuccess: (mock) => {
      queryClient.setQueryData(queryKeys.mock(mock.id), mock);
      void queryClient.invalidateQueries({ queryKey: queryKeys.mocks(planId) });
      router.push(`/plans/${planId}/mocks/${mock.id}`);
    },
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        start.reset();
        onClose();
      }}
      dismissible={!start.isPending}
      size="lg"
      title="Start a mock interview"
      description="The AI interviewer asks one question at a time and scores each answer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={start.isPending}>
            Cancel
          </Button>
          <Button onClick={() => start.mutate()} loading={start.isPending} leftIcon={<Play className="size-4" aria-hidden />}>
            {start.isPending ? "Interviewer is getting ready…" : "Start interview"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <Field label="Interview type" asGroup>
          {() => (
            <div role="radiogroup" aria-label="Interview type" className="grid gap-2 sm:grid-cols-2">
              {MOCK_TYPES.map((t) => {
                const selected = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={start.isPending}
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-xl border p-3.5 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary-soft ring-1 ring-primary"
                        : "border-border-strong hover:border-fg-subtle",
                    )}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold">
                      {MOCK_TYPE_LABELS[t]}
                      {selected && <Check className="size-4 text-primary" aria-hidden />}
                    </span>
                    <span className="mt-1 block text-xs text-fg-muted">{MOCK_TYPE_HINTS[t]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>
        <Field label="Number of questions">
          {(p) => (
            <NumberStepper
              id={p.id}
              label="number of questions"
              value={questionCount}
              onChange={setQuestionCount}
              min={LIMITS.mockQuestionCount.min}
              max={LIMITS.mockQuestionCount.max}
              suffix="questions"
            />
          )}
        </Field>
        <Field label="Focus on specific topics" asGroup optional>
          {() => (
            <TopicPicker
              days={detail.days}
              value={topicIds}
              onChange={setTopicIds}
              max={20}
              emptyLabel="The interviewer will pick from the whole plan"
            />
          )}
        </Field>
        {start.isPending && (
          <div className="flex items-center gap-3 rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary-soft-fg" role="status">
            <Spinner size="sm" />
            Preparing your interviewer — this can take up to a minute.
          </div>
        )}
        {start.isError && <ApiErrorCallout error={start.error} title="Couldn't start the interview" />}
      </div>
    </Dialog>
  );
}
