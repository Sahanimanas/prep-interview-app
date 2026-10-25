"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { BackLink } from "@/components/app/back-link";
import { ResourceError } from "@/components/app/resource-error";
import { CoverArt } from "@/components/art/cover-art";
import { TargetIllustration } from "@/components/illustrations";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { QuizRunner } from "./quiz-runner";

export function QuizView({ params }: { params: Promise<{ planId: string; quizId: string }> }) {
  const { planId, quizId } = use(params);
  const quiz = useQuery({ queryKey: queryKeys.quiz(quizId), queryFn: () => api.getQuiz(quizId) });

  if (quiz.isPending) return <PageSkeleton label="Loading quiz…" />;
  if (quiz.isError) {
    return (
      <ResourceError
        error={quiz.error}
        resource="quiz"
        backHref={`/plans/${planId}`}
        backLabel="Back to plan"
        onRetry={() => void quiz.refetch()}
        retrying={quiz.isFetching}
      />
    );
  }

  const data = quiz.data;
  const backHref = data.topicId ? `/plans/${planId}/topics/${data.topicId}` : `/plans/${planId}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <title>{`${data.title} · PrepPilot`}</title>
      <BackLink href={backHref}>{data.topicId ? "Back to topic" : "Back to plan"}</BackLink>
      <CoverArt seed={data.id + data.title} rounded="rounded-3xl" className="shadow-lift">
        <div className="flex items-center justify-between gap-6 bg-linear-to-r from-black/45 to-black/5 p-6 text-white sm:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 backdrop-blur">
                {data.topicId ? "Topic quiz" : "Revision quiz"}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 backdrop-blur">{data.questionCount} questions</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{data.title}</h1>
            <p className="mt-1.5 text-white/85">One question at a time — submit to see explanations.</p>
          </div>
          <div className="hidden w-32 shrink-0 rounded-2xl bg-white/90 p-2 shadow-lg sm:block">
            <TargetIllustration />
          </div>
        </div>
      </CoverArt>
      <QuizRunner key={`${data.id}:${data.createdAt}`} quiz={data} topicId={data.topicId} />
    </div>
  );
}
