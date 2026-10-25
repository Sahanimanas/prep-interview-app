"use client";

import { LIMITS, isJobPending, type PlanDetail, type QuizSummary } from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ListChecks, Plus, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { TargetIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { formatDate, formatPercent } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useJob, useQuizzes } from "@/lib/queries";
import { TopicPicker } from "./topic-picker";

export function QuizzesTab({ detail }: { detail: PlanDetail }) {
  const planId = detail.plan.id;
  const quizzes = useQuizzes(planId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">
          Topic quizzes and revision quizzes that mix questions across everything you&apos;ve studied.
        </p>
        <Button onClick={() => setDialogOpen(true)} leftIcon={<Plus className="size-4" aria-hidden />} disabled={Boolean(jobId)}>
          Create revision quiz
        </Button>
      </div>

      {jobId && (
        <RevisionJobStatus
          planId={planId}
          jobId={jobId}
          onDismiss={() => setJobId(null)}
          onRetry={() => {
            setJobId(null);
            setDialogOpen(true);
          }}
        />
      )}

      {quizzes.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Loading quizzes">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : quizzes.isError ? (
        <ApiErrorCallout error={quizzes.error} title="Couldn't load quizzes" onRetry={() => void quizzes.refetch()} />
      ) : quizzes.data.length === 0 ? (
        <EmptyState
          illustration={<TargetIllustration />}
          title="No quizzes yet"
          description="Generate a quiz from any topic page, or create a revision quiz that covers several topics at once."
          action={
            <Button variant="outline" onClick={() => setDialogOpen(true)} leftIcon={<Sparkles className="size-4" aria-hidden />}>
              Create revision quiz
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {quizzes.data.map((quiz) => (
            <li key={quiz.id}>
              <QuizCard planId={planId} quiz={quiz} />
            </li>
          ))}
        </ul>
      )}

      <RevisionQuizDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        detail={detail}
        onStarted={(id) => {
          setJobId(id);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function QuizCard({ planId, quiz }: { planId: string; quiz: QuizSummary }) {
  return (
    <Link
      href={`/plans/${planId}/quizzes/${quiz.id}`}
      className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-pink-500 text-white shadow-md transition-transform group-hover:scale-110 group-hover:-rotate-6">
        <ListChecks className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium group-hover:text-primary">{quiz.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
          <span>{quiz.questionCount} questions</span>
          <span aria-hidden>·</span>
          <span>{quiz.attemptCount === 0 ? "Not attempted" : `${quiz.attemptCount} attempts`}</span>
          {quiz.topicId === null && <Badge tone="outline">Revision</Badge>}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {quiz.bestPercentage !== null && (
          <Badge tone={quiz.bestPercentage >= 80 ? "success" : quiz.bestPercentage >= 50 ? "warning" : "danger"}>
            Best {formatPercent(quiz.bestPercentage)}
          </Badge>
        )}
        <span className="text-xs text-fg-subtle">{formatDate(quiz.createdAt)}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
    </Link>
  );
}

function RevisionJobStatus({
  planId,
  jobId,
  onDismiss,
  onRetry,
}: {
  planId: string;
  jobId: string;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const job = useJob(jobId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = job.data?.status;
  const resultId = job.data?.resultId ?? null;

  useEffect(() => {
    if (status === "succeeded" && resultId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes(planId) });
      router.push(`/plans/${planId}/quizzes/${resultId}`);
    }
  }, [status, resultId, planId, queryClient, router]);

  if (job.isError) {
    return <ApiErrorCallout error={job.error} title="Lost track of your revision quiz" onRetry={() => void job.refetch()} />;
  }
  if (status === "failed") {
    return (
      <Callout
        tone="danger"
        title="Revision quiz generation failed"
        action={
          <>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
            <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
              Try again
            </Button>
          </>
        }
      >
        {job.data?.error ?? "The AI couldn't generate this quiz."}
      </Callout>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary-soft p-4" role="status">
      <div className="flex items-center gap-3 text-sm text-primary-soft-fg">
        <Spinner size="sm" />
        <span>
          <strong className="font-semibold">
            {status === "succeeded" ? "Quiz ready — opening…" : "Generating your revision quiz…"}
          </strong>{" "}
          {status !== "succeeded" && "This usually takes under a minute. You can keep browsing."}
        </span>
      </div>
      {(!job.data || isJobPending(job.data)) && <Progress label="Generating revision quiz" size="sm" />}
    </div>
  );
}

function RevisionQuizDialog({
  open,
  onClose,
  detail,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  detail: PlanDetail;
  onStarted: (jobId: string) => void;
}) {
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);

  const create = useMutation({
    mutationFn: () =>
      api.createRevisionQuiz(detail.plan.id, {
        topicIds: topicIds.length > 0 ? topicIds : undefined,
        questionCount,
      }),
    onSuccess: (job) => onStarted(job.id),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!create.isPending}
      title="Create a revision quiz"
      description="Mix questions from several topics to check what's stuck."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} leftIcon={<Sparkles className="size-4" aria-hidden />}>
            Generate quiz
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Number of questions">
          {(p) => (
            <NumberStepper
              id={p.id}
              label="number of questions"
              value={questionCount}
              onChange={setQuestionCount}
              min={LIMITS.revisionQuizQuestionCount.min}
              max={LIMITS.revisionQuizQuestionCount.max}
              suffix="questions"
            />
          )}
        </Field>
        <Field label="Topics" asGroup optional>
          {() => (
            <TopicPicker
              days={detail.days}
              value={topicIds}
              onChange={setTopicIds}
              max={30}
              emptyLabel="All topics (none selected)"
            />
          )}
        </Field>
        {create.isError && <ApiErrorCallout error={create.error} title="Couldn't start the quiz" />}
      </div>
    </Dialog>
  );
}
