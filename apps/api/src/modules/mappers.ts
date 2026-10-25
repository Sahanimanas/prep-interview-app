import type {
  ClarifyingAnswer,
  CurrentLevel,
  Difficulty,
  InterviewQuestion,
  InterviewType,
  LearningDoc,
  MockDetail,
  MockFeedback,
  MockMessage,
  MockScorecard,
  MockSummary,
  MockType,
  Plan,
  PlanStatus,
  PlanSummary,
  QuestionKind,
  QuizAttemptResult,
  QuizDetail,
  QuizSummary,
  TopicStatus,
  TopicSummary,
} from '@preppilot/shared';
import type { CandidateProfile, MockSetup, TopicRef } from '../ai/types';
import { diffDays, todayISO } from '../lib/dates';

// ---------------------------------------------------------------- plans

export interface PlanRow {
  id: string;
  user_id: string;
  title: string;
  technology: string;
  target_role: string;
  years_of_experience: number;
  hours_per_day: number;
  current_level: CurrentLevel;
  interview_types: InterviewType[];
  company: string | null;
  focus_areas: string[];
  notes: string | null;
  clarifying_answers: ClarifyingAnswer[];
  start_date: string;
  interview_date: string;
  total_days: number;
  status: PlanStatus;
  summary: string | null;
  tips: string[];
  error: string | null;
  created_at: Date;
  /** Computed by PLAN_SELECT. */
  completed_topics: number;
  total_topics: number;
}

/** Selects a plan with progress counts. Append WHERE / ORDER clauses. */
export const PLAN_SELECT = `
  SELECT p.*,
    (SELECT count(*)::int FROM topics t WHERE t.plan_id = p.id AND t.status = 'completed') AS completed_topics,
    (SELECT count(*)::int FROM topics t WHERE t.plan_id = p.id) AS total_topics
  FROM plans p`;

export function toPlanSummary(row: PlanRow): PlanSummary {
  return {
    id: row.id,
    title: row.title,
    technology: row.technology,
    targetRole: row.target_role,
    status: row.status,
    startDate: row.start_date,
    interviewDate: row.interview_date,
    totalDays: row.total_days,
    daysRemaining: diffDays(todayISO(), row.interview_date),
    progress: { completedTopics: row.completed_topics, totalTopics: row.total_topics },
    createdAt: row.created_at.toISOString(),
  };
}

export function toPlan(row: PlanRow): Plan {
  return {
    ...toPlanSummary(row),
    yearsOfExperience: row.years_of_experience,
    hoursPerDay: row.hours_per_day,
    currentLevel: row.current_level,
    interviewTypes: row.interview_types,
    company: row.company,
    focusAreas: row.focus_areas,
    notes: row.notes,
    clarifyingAnswers: row.clarifying_answers,
    summary: row.summary,
    tips: row.tips,
    error: row.error,
  };
}

export function profileFromPlan(row: Omit<PlanRow, 'completed_topics' | 'total_topics'>): CandidateProfile {
  return {
    technology: row.technology,
    targetRole: row.target_role,
    yearsOfExperience: row.years_of_experience,
    currentLevel: row.current_level,
    interviewTypes: row.interview_types,
    company: row.company,
    focusAreas: row.focus_areas,
    notes: row.notes,
    clarifyingAnswers: row.clarifying_answers,
    totalDays: row.total_days,
    hoursPerDay: row.hours_per_day,
  };
}

// ---------------------------------------------------------------- topics

export interface TopicRow {
  id: string;
  plan_id: string;
  day_number: number;
  order_index: number;
  title: string;
  description: string;
  subtopics: string[];
  difficulty: Difficulty;
  estimated_minutes: number;
  status: TopicStatus;
  /** Computed by TOPIC_SELECT. */
  has_doc: boolean;
  question_count: number;
  has_quiz: boolean;
}

export const TOPIC_SELECT = `
  SELECT t.*,
    EXISTS (SELECT 1 FROM learning_docs d WHERE d.topic_id = t.id) AS has_doc,
    (SELECT count(*)::int FROM questions q WHERE q.topic_id = t.id) AS question_count,
    EXISTS (SELECT 1 FROM quizzes z WHERE z.topic_id = t.id) AS has_quiz
  FROM topics t`;

export function toTopicSummary(row: TopicRow): TopicSummary {
  return {
    id: row.id,
    planId: row.plan_id,
    dayNumber: row.day_number,
    orderIndex: row.order_index,
    title: row.title,
    description: row.description,
    subtopics: row.subtopics,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    hasDoc: row.has_doc,
    questionCount: row.question_count,
    hasQuiz: row.has_quiz,
  };
}

export function topicRef(row: Pick<TopicRow, 'title' | 'description' | 'subtopics' | 'difficulty'>): TopicRef {
  return { title: row.title, description: row.description, subtopics: row.subtopics, difficulty: row.difficulty };
}

// ---------------------------------------------------------------- docs & questions

export interface DocRow {
  id: string;
  topic_id: string;
  content_md: string;
  key_takeaways: string[];
  created_at: Date;
}

export function toDoc(row: DocRow): LearningDoc {
  return {
    id: row.id,
    topicId: row.topic_id,
    contentMd: row.content_md,
    keyTakeaways: row.key_takeaways,
    createdAt: row.created_at.toISOString(),
  };
}

export interface QuestionRow {
  id: string;
  topic_id: string;
  topic_title: string;
  question: string;
  answer_md: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  follow_ups: string[];
  bookmarked: boolean;
  confidence: number | null;
}

export const QUESTION_SELECT = `
  SELECT q.*, t.title AS topic_title
  FROM questions q JOIN topics t ON t.id = q.topic_id JOIN plans p ON p.id = t.plan_id`;

export function toQuestion(row: QuestionRow): InterviewQuestion {
  return {
    id: row.id,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    question: row.question,
    answerMd: row.answer_md,
    difficulty: row.difficulty,
    kind: row.kind,
    followUps: row.follow_ups,
    bookmarked: row.bookmarked,
    confidence: row.confidence,
  };
}

// ---------------------------------------------------------------- quizzes

export interface QuizRow {
  id: string;
  plan_id: string;
  topic_id: string | null;
  title: string;
  created_at: Date;
  /** Computed by QUIZ_SELECT. */
  question_count: number;
  attempt_count: number;
  best_percentage: number | null;
}

export const QUIZ_SELECT = `
  SELECT z.*,
    (SELECT count(*)::int FROM quiz_questions qq WHERE qq.quiz_id = z.id) AS question_count,
    (SELECT count(*)::int FROM quiz_attempts a WHERE a.quiz_id = z.id) AS attempt_count,
    (SELECT max(round(100.0 * a.score / NULLIF(a.total, 0)))::int FROM quiz_attempts a WHERE a.quiz_id = z.id) AS best_percentage
  FROM quizzes z JOIN plans p ON p.id = z.plan_id`;

export function toQuizSummary(row: QuizRow): QuizSummary {
  return {
    id: row.id,
    planId: row.plan_id,
    topicId: row.topic_id,
    title: row.title,
    questionCount: row.question_count,
    attemptCount: row.attempt_count,
    bestPercentage: row.best_percentage,
    createdAt: row.created_at.toISOString(),
  };
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  order_index: number;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  answers: number[];
  score: number;
  total: number;
  created_at: Date;
}

export function toAttemptResult(attempt: QuizAttemptRow, questions: QuizQuestionRow[]): QuizAttemptResult {
  return {
    id: attempt.id,
    quizId: attempt.quiz_id,
    score: attempt.score,
    total: attempt.total,
    percentage: attempt.total ? Math.round((100 * attempt.score) / attempt.total) : 0,
    createdAt: attempt.created_at.toISOString(),
    results: questions.map((q, i) => {
      const selected = attempt.answers[i] ?? -1;
      return {
        questionId: q.id,
        selectedIndex: selected,
        correctIndex: q.correct_index,
        correct: selected === q.correct_index,
        explanation: q.explanation,
      };
    }),
  };
}

export function toQuizDetail(
  row: QuizRow,
  questions: QuizQuestionRow[],
  lastAttempt: QuizAttemptRow | null,
): QuizDetail {
  return {
    ...toQuizSummary(row),
    questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options, orderIndex: q.order_index })),
    lastAttempt: lastAttempt ? toAttemptResult(lastAttempt, questions) : null,
  };
}

// ---------------------------------------------------------------- mocks

export interface MockRow {
  id: string;
  plan_id: string;
  type: MockType;
  topic_titles: string[];
  setup: MockSetup;
  question_count: number;
  answered_count: number;
  status: 'in_progress' | 'completed';
  scorecard: MockScorecard | null;
  overall_score: number | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface MockMessageRow {
  id: string;
  mock_id: string;
  seq: number;
  role: 'interviewer' | 'candidate';
  content: string;
  feedback: MockFeedback | null;
  created_at: Date;
}

export function toMockSummary(row: MockRow): MockSummary {
  return {
    id: row.id,
    planId: row.plan_id,
    type: row.type,
    status: row.status,
    questionCount: row.question_count,
    answeredCount: row.answered_count,
    overallScore: row.overall_score,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}

export function toMockMessage(row: MockMessageRow): MockMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    feedback: row.feedback,
    createdAt: row.created_at.toISOString(),
  };
}

export function toMockDetail(row: MockRow, messages: MockMessageRow[]): MockDetail {
  return {
    ...toMockSummary(row),
    topicTitles: row.topic_titles,
    messages: messages.map(toMockMessage),
    scorecard: row.scorecard,
  };
}

