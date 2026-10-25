import type { Difficulty, HiringVerdict, QuestionKind, TopicStatus } from '@preppilot/shared';

import type { Tone } from '@/constants/theme';

export const DIFFICULTY_TONE: Record<Difficulty, Tone> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = {
  conceptual: 'Conceptual',
  coding: 'Coding',
  scenario: 'Scenario',
  behavioral: 'Behavioral',
  system_design: 'System design',
};

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

export const TOPIC_STATUS_TONE: Record<TopicStatus, Tone> = {
  not_started: 'neutral',
  in_progress: 'primary',
  completed: 'success',
};

export const VERDICT_TONE: Record<HiringVerdict, Tone> = {
  strong_hire: 'success',
  hire: 'success',
  lean_hire: 'primary',
  lean_no_hire: 'warning',
  no_hire: 'danger',
};

export function scoreTone(percentage: number): Tone {
  if (percentage >= 80) return 'success';
  if (percentage >= 50) return 'warning';
  return 'danger';
}

export function countdownTone(daysRemaining: number): Tone {
  if (daysRemaining < 0) return 'neutral';
  if (daysRemaining <= 3) return 'warning';
  return 'primary';
}
