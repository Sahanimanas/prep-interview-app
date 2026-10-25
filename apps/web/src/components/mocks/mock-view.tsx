"use client";

import {
  MOCK_TYPE_LABELS,
  VERDICT_LABELS,
  answerMockSchema,
  type HiringVerdict,
  type MockDetail,
  type MockMessage,
  type MockScorecard,
} from "@preppilot/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CircleCheck, Flag, Lightbulb, Send, Target, TrendingUp, UserRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { use, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { InterviewerAvatar, TrophyIllustration } from "@/components/illustrations";
import { BackLink } from "@/components/app/back-link";
import { ResourceError } from "@/components/app/resource-error";
import { Markdown } from "@/components/markdown";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

const MAX_ANSWER = 8000;

const VERDICT_TONE: Record<HiringVerdict, BadgeTone> = {
  strong_hire: "success",
  hire: "success",
  lean_hire: "primary",
  lean_no_hire: "warning",
  no_hire: "danger",
};

function feedbackTone(score: number): BadgeTone {
  return score >= 8 ? "success" : score >= 5 ? "warning" : "danger";
}

export function MockView({ params }: { params: Promise<{ planId: string; mockId: string }> }) {
  const { planId, mockId } = use(params);
  const mock = useQuery({ queryKey: queryKeys.mock(mockId), queryFn: () => api.getMock(mockId) });

  if (mock.isPending) return <PageSkeleton label="Loading interview…" />;
  if (mock.isError) {
    return (
      <ResourceError
        error={mock.error}
        resource="mock interview"
        backHref={`/plans/${planId}`}
        backLabel="Back to plan"
        onRetry={() => void mock.refetch()}
        retrying={mock.isFetching}
      />
    );
  }
  return <MockInterview planId={planId} mock={mock.data} />;
}

function MockInterview({ planId, mock }: { planId: string; mock: MockDetail }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaId = useId();
  const completed = mock.status === "completed";

  const onMockUpdated = (next: MockDetail) => {
    if (next.status === "completed" && (next.scorecard?.overallScore ?? 0) >= 70) void celebrate("big");
    queryClient.setQueryData(queryKeys.mock(next.id), next);
    void queryClient.invalidateQueries({ queryKey: queryKeys.mocks(planId) });
    if (next.status === "completed") void queryClient.invalidateQueries({ queryKey: queryKeys.plan(planId) });
  };

  const answer = useMutation({
    mutationFn: (text: string) => api.answerMock(mock.id, { answer: text }),
    onSuccess: (next) => {
      onMockUpdated(next);
      setDraft("");
    },
  });

  const end = useMutation({
    mutationFn: () => api.endMock(mock.id),
    onSuccess: (next) => {
      onMockUpdated(next);
      setEndOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const busy = answer.isPending || end.isPending;
  const messageCount = mock.messages.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, answer.isPending]);

  function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (busy || completed) return;
    const parsed = answerMockSchema.safeParse({ answer: draft });
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? "Type your answer first");
      return;
    }
    setDraftError(null);
    answer.mutate(parsed.data.answer);
  }

  const progressPct = (mock.answeredCount / Math.max(1, mock.questionCount)) * 100;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <title>{`${MOCK_TYPE_LABELS[mock.type]} mock interview · PrepPilot`}</title>
      <BackLink href={`/plans/${planId}`}>Back to plan</BackLink>

      <header className="pp-hero-gradient relative flex animate-gradient flex-col gap-5 overflow-hidden rounded-3xl p-6 text-white shadow-glow sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div aria-hidden className="pp-dots absolute inset-0 opacity-20" />
        <div className="relative flex min-w-0 items-center gap-5">
        <InterviewerAvatar className="hidden size-20 shrink-0 drop-shadow-xl sm:block" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 [&>span]:bg-white/20 [&>span]:text-white">
            <Badge tone={completed ? "success" : "primary"}>{completed ? "Completed" : "In progress"}</Badge>
            <Badge tone="outline">{mock.questionCount} questions</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {MOCK_TYPE_LABELS[mock.type]} interview
          </h1>
          {mock.topicTitles.length > 0 && (
            <p className="mt-1.5 text-sm text-white/80">Covering: {mock.topicTitles.join(", ")}</p>
          )}
        </div>
        </div>
        {!completed && (
          <Button
            variant="outline"
            className="relative border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setEndOpen(true)}
            disabled={busy}
            leftIcon={<Flag className="size-4" aria-hidden />}
          >
            End interview
          </Button>
        )}
      </header>

      {!completed && (
        <div>
          <div className="mb-2 flex justify-between text-xs text-fg-subtle">
            <span>
              Question {Math.min(mock.answeredCount + 1, mock.questionCount)} of {mock.questionCount}
            </span>
            <span>{mock.answeredCount} answered</span>
          </div>
          <Progress value={progressPct} size="sm" label="Interview progress" />
        </div>
      )}

      {completed && mock.scorecard && <Scorecard scorecard={mock.scorecard} planId={planId} />}
      {completed && !mock.scorecard && (
        <Card>
          <CardContent className="text-sm text-fg-muted">This interview ended without enough answers to score.</CardContent>
        </Card>
      )}

      <section aria-label="Interview transcript" className="flex flex-col gap-4">
        {completed && <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Transcript</h2>}
        <ol className="flex flex-col gap-4" aria-live="polite">
          {mock.messages.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <ChatMessage message={m} />
            </motion.li>
          ))}
          {answer.isPending && answer.variables && (
            <>
              <li>
                <ChatBubble role="candidate" pending>
                  <p className="whitespace-pre-wrap">{answer.variables}</p>
                </ChatBubble>
              </li>
              <li>
                <ThinkingBubble />
              </li>
            </>
          )}
          {end.isPending && (
            <li>
              <ThinkingBubble label="Interviewer is writing your scorecard…" />
            </li>
          )}
        </ol>
        <div ref={bottomRef} />
      </section>

      {!completed && (
        <form
          onSubmit={onSubmit}
          className="sticky bottom-0 -mx-4 border-t border-border bg-bg/95 px-4 pb-4 pt-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-surface sm:p-4"
        >
          <label htmlFor={textareaId} className="sr-only">
            Your answer
          </label>
          <Textarea
            id={textareaId}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (draftError) setDraftError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={busy}
            invalid={Boolean(draftError)}
            maxLength={MAX_ANSWER}
            rows={4}
            placeholder={busy ? "Interviewer is thinking…" : "Type your answer like you would say it in the interview…"}
            className="min-h-28 resize-y"
            aria-describedby={`${textareaId}-help`}
          />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p id={`${textareaId}-help`} className={cn("text-xs", draftError ? "text-danger" : "text-fg-subtle")}>
              {draftError ?? (
                <>
                  <kbd className="font-sans">Ctrl</kbd>/<kbd className="font-sans">⌘</kbd> + <kbd className="font-sans">Enter</kbd> to send ·{" "}
                  {draft.length}/{MAX_ANSWER}
                </>
              )}
            </p>
            <Button type="submit" loading={answer.isPending} disabled={busy} leftIcon={<Send className="size-4" aria-hidden />}>
              {answer.isPending ? "Sending…" : "Send answer"}
            </Button>
          </div>
          {answer.isError && <ApiErrorCallout error={answer.error} title="Your answer wasn't sent" className="mt-3" />}
        </form>
      )}

      <Dialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        dismissible={!end.isPending}
        size="sm"
        title="End the interview now?"
        description="You'll get a scorecard based on the answers you've given so far."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEndOpen(false)} disabled={end.isPending}>
              Keep going
            </Button>
            <Button onClick={() => end.mutate()} loading={end.isPending} leftIcon={<Flag className="size-4" aria-hidden />}>
              {end.isPending ? "Scoring…" : "End & get scorecard"}
            </Button>
          </>
        }
      >
        {end.isPending ? (
          <p className="text-sm text-fg-muted">The interviewer is writing your scorecard. This can take up to a minute.</p>
        ) : (
          <p className="text-sm text-fg-muted">
            {mock.answeredCount} of {mock.questionCount} questions answered.
          </p>
        )}
        {end.isError && <ApiErrorCallout error={end.error} title="Couldn't end the interview" className="mt-4" />}
      </Dialog>
    </div>
  );
}

function ChatBubble({
  role,
  children,
  pending,
}: {
  role: MockMessage["role"];
  children: ReactNode;
  pending?: boolean;
}) {
  const interviewer = role === "interviewer";
  return (
    <div className={cn("flex gap-3", !interviewer && "flex-row-reverse")}>
      {interviewer ? (
        <InterviewerAvatar className="size-10 shadow-md" />
      ) : (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-indigo-500 text-white shadow-md"
        >
          <UserRound className="size-5" />
        </span>
      )}
      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1.5 lg:max-w-[75%]", !interviewer && "items-end")}>
        <span className="text-xs font-medium text-fg-subtle">{interviewer ? "Interviewer" : "You"}</span>
        <div
          className={cn(
            "min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed",
            interviewer
              ? "rounded-tl-sm border border-border bg-surface shadow-card"
              : "rounded-tr-sm bg-linear-to-br from-primary to-accent text-white shadow-glow",
            pending && "opacity-70",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: MockMessage }) {
  if (message.role === "interviewer") {
    return (
      <ChatBubble role="interviewer">
        <Markdown size="sm">{message.content}</Markdown>
      </ChatBubble>
    );
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <ChatBubble role="candidate">
        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
      </ChatBubble>
      {message.feedback && <FeedbackPanel feedback={message.feedback} />}
    </div>
  );
}

function FeedbackPanel({ feedback }: { feedback: NonNullable<MockMessage["feedback"]> }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="w-full max-w-[85%] pr-[52px] lg:max-w-[75%]">
      <div className="rounded-xl border border-border bg-surface-muted">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2 font-medium">
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 14, delay: 0.15 }}
              className="inline-flex"
            >
              <Badge tone={feedbackTone(feedback.score)} className="text-sm font-bold">
                {feedback.score}/10
              </Badge>
            </motion.span>
            Feedback on this answer
          </span>
          <ChevronDown className={cn("size-4 text-fg-subtle transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && (
          <div id={panelId} className="animate-fade-in flex flex-col gap-4 border-t border-border px-4 py-4">
            <p className="text-sm leading-relaxed">{feedback.comment}</p>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                <Lightbulb className="size-3.5" aria-hidden /> A strong answer
              </p>
              <Markdown size="sm">{feedback.idealAnswer}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble({ label = "Interviewer is thinking…" }: { label?: string }) {
  return (
    <div className="flex gap-3" role="status">
      <InterviewerAvatar className="size-10 animate-pulse shadow-md" />
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 animate-bounce rounded-full bg-primary"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        <span className="text-sm text-fg-muted">{label}</span>
      </div>
    </div>
  );
}

function Scorecard({ scorecard, planId }: { scorecard: MockScorecard; planId: string }) {
  const score = Math.round(scorecard.overallScore);
  const tone = VERDICT_TONE[scorecard.verdict];

  return (
    <Card className="overflow-hidden">
      <div className="pp-mesh flex flex-col items-center gap-6 border-b border-border px-6 py-8 sm:flex-row sm:items-center">
        <ProgressRing
          value={score}
          size={128}
          stroke={12}
          label={"Overall score " + score + " out of 100"}
          tone={score >= 75 ? "success" : score >= 50 ? "warning" : "danger"}
        >
          <span className="text-3xl font-bold tabular-nums">{score}</span>
          <span className="text-xs text-fg-subtle">/ 100</span>
        </ProgressRing>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Verdict</p>
          <Badge tone={tone} className="mt-1.5 px-3 py-1 text-sm">
            {VERDICT_LABELS[scorecard.verdict]}
          </Badge>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{scorecard.summary}</p>
        </div>
        <div className="hidden w-40 shrink-0 md:block">
          <TrophyIllustration />
        </div>
      </div>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <ScoreList
          title="Strengths"
          icon={<CircleCheck className="size-4 text-success" aria-hidden />}
          items={scorecard.strengths}
        />
        <ScoreList
          title="To improve"
          icon={<TrendingUp className="size-4 text-warning" aria-hidden />}
          items={scorecard.improvements}
        />
        {scorecard.recommendedTopics.length > 0 && (
          <div className="md:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-primary" aria-hidden /> Recommended topics to revise
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {scorecard.recommendedTopics.map((t) => (
                <Badge key={t} tone="primary">
                  {t}
                </Badge>
              ))}
            </div>
            <Link href={`/plans/${planId}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Open your plan to revise →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreList({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-fg-subtle">—</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-subtle" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
