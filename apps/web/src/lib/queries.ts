"use client";

import { isJobPending, topicHasPendingJobs } from "@preppilot/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { POLL_INTERVAL_MS, queryKeys } from "./query-keys";

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans(),
    queryFn: () => api.listPlans(),
    refetchInterval: (query) =>
      query.state.data?.some((plan) => plan.status === "generating") ? POLL_INTERVAL_MS : false,
  });
}

/** Plan detail; polls every ~3s while the plan is being generated. */
export function usePlan(planId: string) {
  return useQuery({
    queryKey: queryKeys.plan(planId),
    queryFn: () => api.getPlan(planId),
    refetchInterval: (query) => (query.state.data?.plan.status === "generating" ? POLL_INTERVAL_MS : false),
  });
}

/** Topic detail; polls every ~3s while any doc/questions/quiz job is queued or running. */
export function useTopic(topicId: string) {
  return useQuery({
    queryKey: queryKeys.topic(topicId),
    queryFn: () => api.getTopic(topicId),
    refetchInterval: (query) => (topicHasPendingJobs(query.state.data) ? POLL_INTERVAL_MS : false),
  });
}

/** Polls a background job until it succeeds or fails. */
export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.job(jobId ?? "none"),
    queryFn: () => api.getJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => (!query.state.data || isJobPending(query.state.data) ? POLL_INTERVAL_MS : false),
  });
}

export function useQuizzes(planId: string) {
  return useQuery({ queryKey: queryKeys.quizzes(planId), queryFn: () => api.listQuizzes(planId) });
}

export function useMocks(planId: string) {
  return useQuery({ queryKey: queryKeys.mocks(planId), queryFn: () => api.listMocks(planId) });
}

export function useQuestions(planId: string, filter: { bookmarked?: boolean; topicId?: string }) {
  return useQuery({
    queryKey: queryKeys.questions(planId, filter),
    queryFn: () => api.listQuestions(planId, filter),
  });
}
