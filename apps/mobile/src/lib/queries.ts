import {
  isJobPending,
  topicHasPendingJobs,
  type AnswerMockInput,
  type CreateMockInput,
  type CreatePlanInput,
  type CreateRevisionQuizInput,
  type InterviewQuestion,
  type Job,
  type Me,
  type MockDetail,
  type PlanDetail,
  type QuizAttemptResult,
  type QuizDetail,
  type SetApiKeyInput,
  type TopicContentKind,
  type TopicDetail,
  type TopicStatus,
  type UpdateProfileInput,
  type UpdateQuestionInput,
} from '@preppilot/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { POLL_INTERVAL_MS } from '@/lib/config';

export interface QuestionFilter {
  bookmarked?: boolean;
  topicId?: string;
}

export const queryKeys = {
  me: ['me'] as const,
  plans: ['plans'] as const,
  plan: (planId: string) => ['plan', planId] as const,
  topicRoot: ['topic'] as const,
  topic: (topicId: string) => ['topic', topicId] as const,
  questionsRoot: ['questions'] as const,
  questionsForPlan: (planId: string) => ['questions', planId] as const,
  questions: (planId: string, filter: QuestionFilter) =>
    ['questions', planId, { bookmarked: filter.bookmarked ?? null, topicId: filter.topicId ?? null }] as const,
  quizzes: (planId: string) => ['quizzes', planId] as const,
  quiz: (quizId: string) => ['quiz', quizId] as const,
  mocks: (planId: string) => ['mocks', planId] as const,
  mock: (mockId: string) => ['mock', mockId] as const,
  job: (jobId: string) => ['job', jobId] as const,
};

/** Runs `onSettle` once when `pending` flips from true to false. */
function useOnPendingSettled(pending: boolean, onSettle: () => void): void {
  const wasPending = useRef(pending);
  useEffect(() => {
    if (wasPending.current && !pending) onSettle();
    wasPending.current = pending;
  }, [pending, onSettle]);
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me, staleTime: 60_000 });
}

function useMeMutation<TInput>(fn: (input: TInput) => Promise<Me>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (me) => qc.setQueryData(queryKeys.me, me),
  });
}

export function useUpdateProfile() {
  return useMeMutation((input: UpdateProfileInput) => api.updateProfile(input));
}

export function useSetApiKey() {
  return useMeMutation((input: SetApiKeyInput) => api.setApiKey(input));
}

export function useDeleteApiKey() {
  return useMeMutation((_: void) => api.deleteApiKey());
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: api.listPlans,
    refetchInterval: (query) =>
      query.state.data?.some((plan) => plan.status === 'generating') ? POLL_INTERVAL_MS : false,
  });
}

export function usePlan(planId: string, options: { enabled?: boolean } = {}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.plan(planId),
    queryFn: () => api.getPlan(planId),
    enabled: !!planId && (options.enabled ?? true),
    refetchInterval: (q) => (q.state.data?.plan.status === 'generating' ? POLL_INTERVAL_MS : false),
  });
  const generating = query.data?.plan.status === 'generating';
  useOnPendingSettled(generating, () => {
    void qc.invalidateQueries({ queryKey: queryKeys.plans });
  });
  return query;
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => api.createPlan(input),
    onSuccess: (detail) => {
      qc.setQueryData(queryKeys.plan(detail.plan.id), detail);
      void qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

export function useRetryPlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.retryPlan(planId),
    onSuccess: (detail) => {
      qc.setQueryData(queryKeys.plan(planId), detail);
      void qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.deletePlan(planId),
    onSuccess: (_data, planId) => {
      qc.removeQueries({ queryKey: queryKeys.plan(planId) });
      void qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export function useTopic(topicId: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.topic(topicId),
    queryFn: () => api.getTopic(topicId),
    enabled: !!topicId,
    refetchInterval: (q) => (topicHasPendingJobs(q.state.data) ? POLL_INTERVAL_MS : false),
  });
  const pending = topicHasPendingJobs(query.data);
  const planId = query.data?.topic.planId;
  useOnPendingSettled(pending, () => {
    if (!planId) return;
    // New content changes hasDoc/questionCount/hasQuiz on the plan and the question bank.
    void qc.invalidateQueries({ queryKey: queryKeys.plan(planId) });
    void qc.invalidateQueries({ queryKey: queryKeys.questionsForPlan(planId) });
    void qc.invalidateQueries({ queryKey: queryKeys.quizzes(planId) });
  });
  return query;
}

export function useGenerateTopicContent(topicId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: TopicContentKind; regenerate?: boolean }) =>
      api.generateTopicContent(topicId, input),
    onSuccess: (job, { kind }) => {
      qc.setQueryData<TopicDetail>(queryKeys.topic(topicId), (prev) =>
        prev ? { ...prev, jobs: { ...prev.jobs, [kind]: job } } : prev,
      );
      void qc.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
    },
  });
}

function patchTopicStatusInPlan(detail: PlanDetail, topicId: string, status: TopicStatus): PlanDetail {
  return {
    ...detail,
    days: detail.days.map((day) => ({
      ...day,
      topics: day.topics.map((t) => (t.id === topicId ? { ...t, status } : t)),
    })),
  };
}

export function useUpdateTopicStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { topicId: string; planId: string; status: TopicStatus }) =>
      api.updateTopic(vars.topicId, { status: vars.status }),
    onMutate: async ({ topicId, planId, status }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.topic(topicId) }),
        qc.cancelQueries({ queryKey: queryKeys.plan(planId) }),
      ]);
      const prevTopic = qc.getQueryData<TopicDetail>(queryKeys.topic(topicId));
      const prevPlan = qc.getQueryData<PlanDetail>(queryKeys.plan(planId));
      if (prevTopic) qc.setQueryData<TopicDetail>(queryKeys.topic(topicId), { ...prevTopic, topic: { ...prevTopic.topic, status } });
      if (prevPlan) qc.setQueryData<PlanDetail>(queryKeys.plan(planId), patchTopicStatusInPlan(prevPlan, topicId, status));
      return { prevTopic, prevPlan };
    },
    onError: (_err, { topicId, planId }, ctx) => {
      if (ctx?.prevTopic) qc.setQueryData(queryKeys.topic(topicId), ctx.prevTopic);
      if (ctx?.prevPlan) qc.setQueryData(queryKeys.plan(planId), ctx.prevPlan);
    },
    onSettled: (_data, _err, { planId, topicId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.plan(planId) });
      void qc.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
      void qc.invalidateQueries({ queryKey: queryKeys.plans });
    },
  });
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

export function useQuestions(planId: string, filter: QuestionFilter = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.questions(planId, filter),
    queryFn: () => api.listQuestions(planId, filter),
    enabled: enabled && !!planId,
  });
}

type Snapshot = [QueryKey, unknown][];

function patchQuestionCaches(qc: QueryClient, questionId: string, patch: Partial<InterviewQuestion>): void {
  qc.setQueriesData<InterviewQuestion[]>({ queryKey: queryKeys.questionsRoot }, (list) =>
    list?.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
  );
  qc.setQueriesData<TopicDetail>({ queryKey: queryKeys.topicRoot }, (detail) =>
    detail && detail.questions.some((q) => q.id === questionId)
      ? { ...detail, questions: detail.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)) }
      : detail,
  );
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { questionId: string; input: UpdateQuestionInput }) =>
      api.updateQuestion(vars.questionId, vars.input),
    onMutate: async ({ questionId, input }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.questionsRoot }),
        qc.cancelQueries({ queryKey: queryKeys.topicRoot }),
      ]);
      const snapshot: Snapshot = [
        ...qc.getQueriesData({ queryKey: queryKeys.questionsRoot }),
        ...qc.getQueriesData({ queryKey: queryKeys.topicRoot }),
      ];
      const patch: Partial<InterviewQuestion> = {};
      if (input.bookmarked !== undefined) patch.bookmarked = input.bookmarked;
      if (input.confidence !== undefined) patch.confidence = input.confidence;
      patchQuestionCaches(qc, questionId, patch);
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (question) => {
      patchQuestionCaches(qc, question.id, question);
    },
    onSettled: (_data, _err, vars) => {
      // Bookmark filters may now include/exclude the question.
      if (vars.input.bookmarked !== undefined) {
        void qc.invalidateQueries({ queryKey: queryKeys.questionsRoot });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export function useQuizzes(planId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizzes(planId),
    queryFn: () => api.listQuizzes(planId),
    enabled: enabled && !!planId,
  });
}

export function useQuiz(quizId: string) {
  return useQuery({
    queryKey: queryKeys.quiz(quizId),
    queryFn: () => api.getQuiz(quizId),
    enabled: !!quizId,
  });
}

export function useSubmitQuizAttempt(quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: number[]) => api.submitQuizAttempt(quizId, { answers }),
    onSuccess: (result: QuizAttemptResult) => {
      qc.setQueryData<QuizDetail>(queryKeys.quiz(quizId), (prev) =>
        prev
          ? {
              ...prev,
              lastAttempt: result,
              attemptCount: prev.attemptCount + 1,
              bestPercentage: Math.max(prev.bestPercentage ?? 0, result.percentage),
            }
          : prev,
      );
      const quiz = qc.getQueryData<QuizDetail>(queryKeys.quiz(quizId));
      if (quiz) {
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes(quiz.planId) });
        void qc.invalidateQueries({ queryKey: queryKeys.plan(quiz.planId) });
        if (quiz.topicId) void qc.invalidateQueries({ queryKey: queryKeys.topic(quiz.topicId) });
      }
    },
  });
}

export function useCreateRevisionQuiz(planId: string) {
  return useMutation({
    mutationFn: (input: CreateRevisionQuizInput) => api.createRevisionQuiz(planId, input),
  });
}

/** Polls a job every few seconds until it succeeds or fails. */
export function useJob(jobId: string | null, initial?: Job) {
  return useQuery({
    queryKey: queryKeys.job(jobId ?? 'none'),
    queryFn: () => api.getJob(jobId as string),
    enabled: !!jobId,
    initialData: initial && initial.id === jobId ? initial : undefined,
    refetchInterval: (q) => (isJobPending(q.state.data) ? POLL_INTERVAL_MS : false),
  });
}

// ---------------------------------------------------------------------------
// Mock interviews
// ---------------------------------------------------------------------------

export function useMocks(planId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.mocks(planId),
    queryFn: () => api.listMocks(planId),
    enabled: enabled && !!planId,
  });
}

export function useMock(mockId: string) {
  return useQuery({
    queryKey: queryKeys.mock(mockId),
    queryFn: () => api.getMock(mockId),
    enabled: !!mockId,
  });
}

function onMockUpdated(qc: QueryClient, mock: MockDetail): void {
  qc.setQueryData(queryKeys.mock(mock.id), mock);
  void qc.invalidateQueries({ queryKey: queryKeys.mocks(mock.planId) });
  if (mock.status === 'completed') void qc.invalidateQueries({ queryKey: queryKeys.plan(mock.planId) });
}

export function useCreateMock(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMockInput) => api.createMock(planId, input),
    onSuccess: (mock) => onMockUpdated(qc, mock),
  });
}

export function useAnswerMock(mockId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnswerMockInput) => api.answerMock(mockId, input),
    onSuccess: (mock) => onMockUpdated(qc, mock),
  });
}

export function useEndMock(mockId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.endMock(mockId),
    onSuccess: (mock) => onMockUpdated(qc, mock),
  });
}
