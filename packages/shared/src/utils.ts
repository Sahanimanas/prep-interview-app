import type { Difficulty, HiringVerdict, JobStatus } from './schemas';
import type { Job, PlanDetail, TopicDetail } from './types';

export const VERDICT_LABELS: Record<HiringVerdict, string> = {
  strong_hire: 'Strong hire',
  hire: 'Hire',
  lean_hire: 'Lean hire',
  lean_no_hire: 'Lean no hire',
  no_hire: 'No hire',
};

export function isJobPending(job: Pick<Job, 'status'> | null | undefined): boolean {
  const pending: JobStatus[] = ['queued', 'running'];
  return !!job && pending.includes(job.status);
}

/** True while any content for the topic is being generated (use to drive polling). */
export function topicHasPendingJobs(detail: TopicDetail | undefined): boolean {
  if (!detail) return false;
  return Object.values(detail.jobs).some((job) => isJobPending(job));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "in 5 days" / "tomorrow" / "today" / "3 days ago" */
export function describeDaysRemaining(days: number): string {
  if (days === 0) return 'Interview is today';
  if (days === 1) return 'Interview is tomorrow';
  if (days > 1) return `${days} days to interview`;
  return `Interview was ${pluralize(-days, 'day')} ago`;
}

// ---------------------------------------------------------------------------
// Gamification: XP, levels and achievements derived from plan progress.
// Pure functions so web and mobile always show identical numbers.
// ---------------------------------------------------------------------------

export const XP_RULES = {
  topicCompleted: { easy: 80, medium: 100, hard: 140 } satisfies Record<Difficulty, number>,
  quizAttempt: 30,
  /** Bonus per attempt scaled by the plan's average quiz score (0-100). */
  quizAccuracyBonus: 20,
  mockCompleted: 150,
  xpPerLevel: 500,
} as const;

export interface Achievement {
  id: 'first_step' | 'halfway' | 'finisher' | 'quiz_taker' | 'quiz_whiz' | 'first_mock' | 'interview_ready';
  title: string;
  description: string;
  unlocked: boolean;
}

export interface PlanProgressSummary {
  xp: number;
  level: number;
  /** XP earned inside the current level and needed for the next one. */
  levelXp: number;
  levelXpTarget: number;
  /** 0-100 share of topics completed. */
  completionPct: number;
  achievements: Achievement[];
}

export function computePlanProgress(detail: Pick<PlanDetail, 'days' | 'stats'>): PlanProgressSummary {
  const { stats } = detail;
  const topics = detail.days.flatMap((d) => d.topics);
  const topicXp = topics
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + XP_RULES.topicCompleted[t.difficulty], 0);
  const quizXp =
    stats.quizAttempts * XP_RULES.quizAttempt +
    Math.round(stats.quizAttempts * XP_RULES.quizAccuracyBonus * ((stats.averageQuizScore ?? 0) / 100));
  const xp = topicXp + quizXp + stats.mocksCompleted * XP_RULES.mockCompleted;
  const completionPct = stats.totalTopics ? Math.round((100 * stats.completedTopics) / stats.totalTopics) : 0;

  const achievements: Achievement[] = [
    { id: 'first_step', title: 'First step', description: 'Complete your first topic', unlocked: stats.completedTopics >= 1 },
    { id: 'halfway', title: 'Halfway there', description: 'Complete half of your topics', unlocked: completionPct >= 50 },
    { id: 'finisher', title: 'Finisher', description: 'Complete every topic in the plan', unlocked: stats.totalTopics > 0 && completionPct === 100 },
    { id: 'quiz_taker', title: 'Quiz taker', description: 'Finish your first quiz', unlocked: stats.quizAttempts >= 1 },
    { id: 'quiz_whiz', title: 'Quiz whiz', description: 'Average 80% or more across quizzes', unlocked: (stats.averageQuizScore ?? 0) >= 80 },
    { id: 'first_mock', title: 'In the hot seat', description: 'Complete a mock interview', unlocked: stats.mocksCompleted >= 1 },
    {
      id: 'interview_ready',
      title: 'Interview ready',
      description: 'Average 70+ in mock interviews',
      unlocked: stats.mocksCompleted >= 1 && (stats.averageMockScore ?? 0) >= 70,
    },
  ];

  return {
    xp,
    level: Math.floor(xp / XP_RULES.xpPerLevel) + 1,
    levelXp: xp % XP_RULES.xpPerLevel,
    levelXpTarget: XP_RULES.xpPerLevel,
    completionPct,
    achievements,
  };
}
