"use client";

import type { InterviewQuestion, PlanDetail, TopicDetail, TopicStatus, UpdateQuestionInput } from "@preppilot/shared";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "./api";
import { celebrate } from "./celebrate";
import { queryKeys } from "./query-keys";

type Snapshot = Array<[QueryKey, unknown]>;

function patchQuestion(q: InterviewQuestion, id: string, patch: UpdateQuestionInput): InterviewQuestion {
  if (q.id !== id) return q;
  return {
    ...q,
    ...(patch.bookmarked !== undefined ? { bookmarked: patch.bookmarked } : {}),
    ...(patch.confidence !== undefined ? { confidence: patch.confidence } : {}),
  };
}

/**
 * Bookmark / confidence updates with optimistic UI across every cached place a question
 * appears: the plan's question-bank lists and the topic detail.
 */
export function useUpdateQuestion(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateQuestionInput; topicId: string }) =>
      api.updateQuestion(id, patch),
    onMutate: async ({ id, patch, topicId }) => {
      const listKey = queryKeys.questionsForPlan(planId);
      const topicKey = queryKeys.topic(topicId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: topicKey }),
      ]);

      const snapshot: Snapshot = [
        ...queryClient.getQueriesData<InterviewQuestion[]>({ queryKey: listKey }),
        [topicKey, queryClient.getQueryData<TopicDetail>(topicKey)],
      ];

      queryClient.setQueriesData<InterviewQuestion[]>({ queryKey: listKey }, (old) =>
        old?.map((q) => patchQuestion(q, id, patch)),
      );
      queryClient.setQueryData<TopicDetail>(topicKey, (old) =>
        old ? { ...old, questions: old.questions.map((q) => patchQuestion(q, id, patch)) } : old,
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, { topicId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.questionsForPlan(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
    },
  });
}

function withTopicStatus(detail: PlanDetail, topicId: string, status: TopicStatus): PlanDetail {
  const days = detail.days.map((day) => ({
    ...day,
    topics: day.topics.map((t) => (t.id === topicId ? { ...t, status } : t)),
  }));
  const completedTopics = days.reduce((n, d) => n + d.topics.filter((t) => t.status === "completed").length, 0);
  return {
    ...detail,
    days,
    stats: { ...detail.stats, completedTopics },
    plan: { ...detail.plan, progress: { ...detail.plan.progress, completedTopics } },
  };
}

/**
 * Topic status changes with optimistic updates to both the plan (schedule, stats, XP) and the
 * topic detail. Fires confetti when the change completes every topic in the plan.
 */
export function useUpdateTopicStatus(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, status }: { topicId: string; status: TopicStatus }) => api.updateTopic(topicId, { status }),
    onMutate: async ({ topicId, status }) => {
      const planKey = queryKeys.plan(planId);
      const topicKey = queryKeys.topic(topicId);
      await Promise.all([queryClient.cancelQueries({ queryKey: planKey }), queryClient.cancelQueries({ queryKey: topicKey })]);
      const previousPlan = queryClient.getQueryData<PlanDetail>(planKey);
      const previousTopic = queryClient.getQueryData<TopicDetail>(topicKey);
      if (previousPlan) {
        const next = withTopicStatus(previousPlan, topicId, status);
        queryClient.setQueryData(planKey, next);
        const total = next.stats.totalTopics;
        if (status === "completed" && total > 0 && next.stats.completedTopics === total && previousPlan.stats.completedTopics < total) {
          void celebrate("big");
        }
      }
      if (previousTopic) queryClient.setQueryData<TopicDetail>(topicKey, { ...previousTopic, topic: { ...previousTopic.topic, status } });
      return { previousPlan, previousTopic };
    },
    onError: (_error, { topicId }, context) => {
      if (context?.previousPlan) queryClient.setQueryData(queryKeys.plan(planId), context.previousPlan);
      if (context?.previousTopic) queryClient.setQueryData(queryKeys.topic(topicId), context.previousTopic);
    },
    onSuccess: (summary, { topicId }) => {
      queryClient.setQueryData<TopicDetail>(queryKeys.topic(topicId), (old) => (old ? { ...old, topic: summary } : old));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plan(planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans() });
    },
  });
}
