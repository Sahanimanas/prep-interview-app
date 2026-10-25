export const queryKeys = {
  plans: () => ["plans"] as const,
  plan: (planId: string) => ["plan", planId] as const,
  topic: (topicId: string) => ["topic", topicId] as const,
  questions: (planId: string, filter: { bookmarked?: boolean; topicId?: string } = {}) =>
    ["questions", planId, filter.bookmarked ?? null, filter.topicId ?? null] as const,
  questionsForPlan: (planId: string) => ["questions", planId] as const,
  quizzes: (planId: string) => ["quizzes", planId] as const,
  quiz: (quizId: string) => ["quiz", quizId] as const,
  mocks: (planId: string) => ["mocks", planId] as const,
  mock: (mockId: string) => ["mock", mockId] as const,
  job: (jobId: string) => ["job", jobId] as const,
};

/** How often to poll async AI generation. */
export const POLL_INTERVAL_MS = 3000;
