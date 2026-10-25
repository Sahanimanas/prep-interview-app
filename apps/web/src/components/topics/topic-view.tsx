"use client";

import {
  TOPIC_STATUSES,
  formatMinutes,
  isJobPending,
  type Job,
  type PlanDetail,
  type TopicContentKind,
  type TopicDetail,
  type TopicSummary,
} from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock,
  Lightbulb,
  ListTree,
  ListChecks,
  MessagesSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CoverArt } from "@/components/art/cover-art";
import { TechLogo } from "@/components/art/tech-logo";
import { AiKeyMissingCallout, ApiErrorCallout } from "@/components/app/api-error-callout";
import { BackLink } from "@/components/app/back-link";
import { ResourceError } from "@/components/app/resource-error";
import { BooksIllustration, ChatIllustration, TargetIllustration } from "@/components/illustrations";
import { extractHeadings } from "@/components/markdown";
import { DocSections } from "@/components/topics/doc-sections";
import { Reveal } from "@/components/motion";
import { TOPIC_STATUS_LABELS } from "@/components/plans/plan-status";
import { QuestionItem } from "@/components/questions/question-item";
import { QuizRunner } from "@/components/quizzes/quiz-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CheckToggle } from "@/components/ui/check-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { TabList, TabPanel } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { useUpdateQuestion, useUpdateTopicStatus } from "@/lib/mutations";
import { queryKeys } from "@/lib/query-keys";
import { usePlan, useTopic } from "@/lib/queries";

type TopicTab = "learn" | "questions" | "quiz";

const KIND_COPY: Record<TopicContentKind, { noun: string; generate: string; pending: string; description: string }> = {
  doc: {
    noun: "learning doc",
    generate: "Generate learning doc",
    pending: "Writing your learning doc…",
    description: "A focused, interview-ready explanation of this topic with code examples and key takeaways.",
  },
  questions: {
    noun: "interview questions",
    generate: "Generate interview questions",
    pending: "Drafting likely interview questions and model answers…",
    description: "Likely interview questions with model answers and follow-ups you can bookmark and rate.",
  },
  quiz: {
    noun: "quiz",
    generate: "Generate quiz",
    pending: "Building your quiz…",
    description: "A multiple-choice quiz with explanations to check your understanding.",
  },
};

export function TopicView({ params }: { params: Promise<{ planId: string; topicId: string }> }) {
  const { planId, topicId } = use(params);
  const topic = useTopic(topicId);
  const plan = usePlan(planId);

  if (topic.isPending) return <PageSkeleton label="Loading topic…" />;
  if (topic.isError) {
    return (
      <ResourceError
        error={topic.error}
        resource="topic"
        backHref={`/plans/${planId}`}
        backLabel="Back to plan"
        onRetry={() => void topic.refetch()}
        retrying={topic.isFetching}
      />
    );
  }

  return <TopicContent planId={planId} detail={topic.data} plan={plan.data} />;
}

function useInvalidateOnJobsSettled(planId: string, detail: TopicDetail) {
  const queryClient = useQueryClient();
  const pendingKinds = (Object.keys(detail.jobs) as TopicContentKind[])
    .filter((kind) => isJobPending(detail.jobs[kind]))
    .join(",");
  const previous = useRef(pendingKinds);

  useEffect(() => {
    if (previous.current && previous.current !== pendingKinds) {
      // Something finished generating: refresh the plan badges, question bank and quiz list.
      void queryClient.invalidateQueries({ queryKey: queryKeys.plan(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.questionsForPlan(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes(planId) });
    }
    previous.current = pendingKinds;
  }, [pendingKinds, planId, queryClient]);
}

function TopicContent({ planId, detail, plan }: { planId: string; detail: TopicDetail; plan: PlanDetail | undefined }) {
  const user = useUser();
  const { topic } = detail;
  const [tab, setTab] = useState<TopicTab>("learn");
  useInvalidateOnJobsSettled(planId, detail);

  const day = plan?.days.find((d) => d.dayNumber === topic.dayNumber);
  const ordered = plan?.days.flatMap((d) => d.topics) ?? [];
  const index = ordered.findIndex((t) => t.id === topic.id);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;

  return (
    <div className="flex flex-col gap-8">
      <title>{`${topic.title} · PrepPilot`}</title>
      <BackLink href={`/plans/${planId}`}>{plan?.plan.title ?? "Back to plan"}</BackLink>
      <Reveal>
        <CoverArt seed={topic.id + topic.title} rounded="rounded-3xl" className="shadow-lift">
          <div className="bg-linear-to-t from-black/60 via-black/25 to-black/0">
            <div className="flex flex-col gap-6 p-5 pt-16 text-white sm:p-8 sm:pt-24 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-end gap-5">
                <TechLogo
                  technology={plan?.plan.technology ?? topic.title}
                  size="xl"
                  variant="glass"
                  className="hidden sm:inline-flex"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/80">
                    Day {topic.dayNumber}
                    {day ? ` · ${day.theme}` : ""}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-balance drop-shadow-sm sm:text-4xl">
                    {topic.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 capitalize backdrop-blur">{topic.difficulty}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 backdrop-blur">
                      <Clock className="size-3" aria-hidden /> {formatMinutes(topic.estimatedMinutes)}
                    </span>
                  </div>
                </div>
              </div>
              <StatusControl planId={planId} topic={topic} />
            </div>
          </div>
        </CoverArt>
      </Reveal>

      <div className="flex flex-col gap-3">
        <p className="max-w-4xl text-fg-muted">{topic.description}</p>
        {topic.subtopics.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Subtopics">
            {topic.subtopics.map((s) => (
              <li key={s}>
                <Badge tone="primary">{s}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!user.aiAvailable && !detail.doc && detail.questions.length === 0 && !detail.quiz && (
        <AiKeyMissingCallout />
      )}

      <section>
        <TabList<TopicTab>
          idBase="topic"
          label="Topic content"
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: "learn",
              label: "Learn",
              icon: <BookOpen className="size-4" aria-hidden />,
              badge: isJobPending(detail.jobs.doc) ? <Spinner size="sm" className="size-3 border-[1.5px]" /> : undefined,
            },
            {
              value: "questions",
              label: "Interview questions",
              icon: <MessagesSquare className="size-4" aria-hidden />,
              badge: isJobPending(detail.jobs.questions) ? (
                <Spinner size="sm" className="size-3 border-[1.5px]" />
              ) : detail.questions.length > 0 ? (
                detail.questions.length
              ) : undefined,
            },
            {
              value: "quiz",
              label: "Quiz",
              icon: <ListChecks className="size-4" aria-hidden />,
              badge: isJobPending(detail.jobs.quiz) ? <Spinner size="sm" className="size-3 border-[1.5px]" /> : undefined,
            },
          ]}
        />
        <TabPanel idBase="topic" value="learn" active={tab === "learn"}>
          <LearnPanel planId={planId} detail={detail} />
        </TabPanel>
        <TabPanel idBase="topic" value="questions" active={tab === "questions"}>
          <QuestionsPanel planId={planId} detail={detail} />
        </TabPanel>
        <TabPanel idBase="topic" value="quiz" active={tab === "quiz"}>
          <QuizPanel detail={detail} />
        </TabPanel>
      </section>

      {(prev || next) && (
        <nav aria-label="Topic navigation" className="grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
          {prev ? <TopicNavLink planId={planId} topic={prev} direction="prev" /> : <span className="hidden sm:block" />}
          {next && <TopicNavLink planId={planId} topic={next} direction="next" />}
        </nav>
      )}
    </div>
  );
}

function TopicNavLink({ planId, topic, direction }: { planId: string; topic: TopicSummary; direction: "prev" | "next" }) {
  return (
    <Link
      href={`/plans/${planId}/topics/${topic.id}`}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift",
        direction === "next" && "sm:col-start-2 sm:flex-row-reverse sm:text-right",
      )}
    >
      {direction === "prev" ? (
        <ArrowLeft className="size-4 shrink-0 text-fg-subtle group-hover:text-primary" aria-hidden />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-fg-subtle group-hover:text-primary" aria-hidden />
      )}
      <span className="min-w-0">
        <span className="block text-xs text-fg-subtle">
          {direction === "prev" ? "Previous" : "Next"} · Day {topic.dayNumber}
        </span>
        <span className="block truncate font-medium group-hover:text-primary">{topic.title}</span>
      </span>
    </Link>
  );
}

function StatusControl({ planId, topic }: { planId: string; topic: TopicSummary }) {
  const update = useUpdateTopicStatus(planId);

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="Topic status"
        className="inline-flex rounded-2xl bg-white/15 p-1 ring-1 ring-white/25 backdrop-blur"
      >
        {TOPIC_STATUSES.map((status) => {
          const selected = topic.status === status;
          return (
            <button
              key={status}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={update.isPending}
              onClick={() => !selected && update.mutate({ topicId: topic.id, status })}
              className="relative rounded-xl px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-wait sm:px-3.5"
            >
              {selected && (
                <motion.span
                  layoutId={`topic-status-${topic.id}`}
                  className="absolute inset-0 rounded-xl bg-white shadow-md"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative flex items-center gap-1.5",
                  selected && (status === "completed" ? "text-emerald-700" : status === "in_progress" ? "text-indigo-700" : "text-slate-700"),
                )}
              >
                {status === "completed" && (
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: selected ? 1 : 0.999, opacity: selected ? 1 : 0.6 }}
                      transition={{ duration: 0.35 }}
                    />
                  </svg>
                )}
                {TOPIC_STATUS_LABELS[status]}
              </span>
            </button>
          );
        })}
      </div>
      {update.isError && <p className="text-xs text-red-200">Couldn&apos;t update the status. Try again.</p>}
    </div>
  );
}

/** Mutation that queues generation for one content kind and seeds the job so polling starts immediately. */
function useGenerate(detail: TopicDetail, kind: TopicContentKind) {
  const queryClient = useQueryClient();
  const topicId = detail.topic.id;
  return useMutation({
    mutationFn: (regenerate: boolean) => api.generateTopicContent(topicId, { kind, regenerate }),
    onSuccess: (job: Job) => {
      queryClient.setQueryData<TopicDetail>(queryKeys.topic(topicId), (old) =>
        old ? { ...old, jobs: { ...old.jobs, [kind]: job } } : old,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
    },
  });
}

/**
 * Shared frame for each content tab: CTA when missing, progress while a job runs,
 * failure + retry, and a Regenerate action when content exists.
 */
function ContentGate({
  detail,
  kind,
  hasContent,
  illustration,
  children,
}: {
  detail: TopicDetail;
  kind: TopicContentKind;
  hasContent: boolean;
  illustration: ReactNode;
  children: ReactNode;
}) {
  const generate = useGenerate(detail, kind);
  const job = detail.jobs[kind];
  const pending = isJobPending(job) || generate.isPending;
  const failed = job?.status === "failed" && !generate.isPending;
  const copy = KIND_COPY[kind];

  const errorCallout = generate.isError ? (
    <ApiErrorCallout error={generate.error} title={`Couldn't start generating the ${copy.noun}`} />
  ) : null;

  if (!hasContent) {
    if (pending) return <GeneratingCard label={copy.pending} />;
    return (
      <div className="flex flex-col gap-4">
        {failed && (
          <Callout tone="danger" title={`Generating the ${copy.noun} failed`}>
            {job?.error ?? "The AI couldn't finish this one."} You can try again.
          </Callout>
        )}
        {errorCallout}
        <Card className="overflow-hidden border-dashed">
          <CardContent className="pp-mesh flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-full max-w-[190px]">{illustration}</div>
            <div>
              <h2 className="text-lg font-semibold">No {copy.noun} yet</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">{copy.description}</p>
            </div>
            <Button onClick={() => generate.mutate(false)} leftIcon={<Sparkles className="size-4" aria-hidden />}>
              {failed ? "Try again" : copy.generate}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pending ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-primary-soft-fg" role="status">
          <Spinner size="sm" />
          Regenerating the {copy.noun}… you can keep reading the current version.
        </div>
      ) : failed ? (
        <Callout
          tone="danger"
          title={`Regenerating the ${copy.noun} failed`}
          action={
            <Button size="sm" variant="outline" onClick={() => generate.mutate(true)}>
              Try again
            </Button>
          }
        >
          {job?.error ?? "The AI couldn't finish this one."} The previous version is shown below.
        </Callout>
      ) : (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generate.mutate(true)}
            leftIcon={<RefreshCw className="size-3.5" aria-hidden />}
          >
            Regenerate
          </Button>
        </div>
      )}
      {errorCallout}
      {children}
    </div>
  );
}

function GeneratingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5" aria-busy="true">
        <div className="flex items-center gap-3 text-sm font-medium" role="status">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="size-4 animate-pulse" aria-hidden />
          </span>
          <span>
            {label}
            <span className="block text-xs font-normal text-fg-subtle">This usually takes 20–60 seconds.</span>
          </span>
        </div>
        <Progress label={label} size="sm" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-9/12" />
          <Skeleton className="h-28 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function LearnPanel({ planId, detail }: { planId: string; detail: TopicDetail }) {
  const doc = detail.doc;
  return (
    <ContentGate detail={detail} kind="doc" hasContent={Boolean(doc)} illustration={<BooksIllustration />}>
      {doc && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <DocSections markdown={doc.contentMd} />
          <aside className="flex flex-col gap-5 xl:sticky xl:top-8 xl:self-start">
            <TableOfContents markdown={doc.contentMd} />
            {doc.keyTakeaways.length > 0 && (
              <Card className="border-primary/25 bg-primary-soft/60">
                <CardContent className="p-5 sm:p-5">
                  <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft-fg">
                    <Lightbulb className="size-4" aria-hidden /> Key takeaways
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {doc.keyTakeaways.map((t) => (
                      <li key={t} className="flex gap-2.5 text-sm leading-relaxed">
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            <FinishCard planId={planId} topic={detail.topic} />
          </aside>
        </div>
      )}
    </ContentGate>
  );
}

function FinishCard({ planId, topic }: { planId: string; topic: TopicSummary }) {
  const update = useUpdateTopicStatus(planId);
  const done = topic.status === "completed";
  return (
    <Card className={cn("transition-colors", done && "border-success/40 bg-success-soft/60")}>
      <CardContent className="flex items-center gap-4 p-5 sm:p-5">
        <CheckToggle
          size="lg"
          checked={done}
          partial={topic.status === "in_progress"}
          disabled={update.isPending}
          label={done ? "Mark topic as not completed" : "Mark topic as completed"}
          onToggle={() => update.mutate({ topicId: topic.id, status: done ? "in_progress" : "completed" })}
        />
        <div className="min-w-0">
          <p className="font-semibold">{done ? "Topic complete!" : "Finished reading?"}</p>
          <p className="text-sm text-fg-muted">
            {done ? "Nice — XP earned. Test yourself with the quiz." : "Mark it complete to earn XP and move on."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TableOfContents({ markdown }: { markdown: string }) {
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length < 2) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <Card>
      <CardContent className="p-5 sm:p-5">
        <nav aria-label="On this page">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <ListTree className="size-4" aria-hidden /> On this page
          </h2>
          <ol className="pp-scrollbar-thin flex max-h-[45vh] flex-col gap-0.5 overflow-y-auto border-l border-border">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  aria-current={active === h.id ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 text-sm transition-colors",
                    h.level === 3 ? "pl-6" : "pl-3",
                    active === h.id
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
                  )}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </CardContent>
    </Card>
  );
}

function QuestionsPanel({ planId, detail }: { planId: string; detail: TopicDetail }) {
  const update = useUpdateQuestion(planId);
  return (
    <ContentGate
      detail={detail}
      kind="questions"
      hasContent={detail.questions.length > 0}
      illustration={<ChatIllustration />}
    >
      <div className="flex flex-col gap-3">
        {detail.questions.map((q, i) => (
          <QuestionItem
            key={q.id}
            question={q}
            index={i}
            onToggleBookmark={() => update.mutate({ id: q.id, topicId: q.topicId, patch: { bookmarked: !q.bookmarked } })}
            onRate={(confidence) => update.mutate({ id: q.id, topicId: q.topicId, patch: { confidence } })}
          />
        ))}
        {update.isError && <ApiErrorCallout error={update.error} title="Couldn't save that change" />}
      </div>
    </ContentGate>
  );
}

function QuizPanel({ detail }: { detail: TopicDetail }) {
  const quiz = detail.quiz;
  return (
    <ContentGate detail={detail} kind="quiz" hasContent={Boolean(quiz)} illustration={<TargetIllustration />}>
      {quiz && <QuizRunner key={`${quiz.id}:${quiz.createdAt}`} quiz={quiz} topicId={detail.topic.id} />}
    </ContentGate>
  );
}
