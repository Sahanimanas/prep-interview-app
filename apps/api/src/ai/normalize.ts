/**
 * Normalisers: turn raw (schema-valid but unconstrained) model output into data that satisfies
 * the contract in `./types`. Pure functions, no I/O; unit-tested in tests/ai.normalize.test.ts.
 */
import type { ClarifyingQuestion, HiringVerdict, MockFeedback, MockScorecard } from '@preppilot/shared';
import { HIRING_VERDICTS } from '@preppilot/shared';
import { AppError } from '../lib/errors';
import type { GeneratedDoc, GeneratedPlan, GeneratedQuestion, GeneratedQuiz } from './types';
import type {
  DocOutput,
  IntakeQuestionsOutput,
  MockEvaluationOutput,
  PlanOutput,
  QuestionsOutput,
  QuizOutput,
  ScorecardOutput,
} from './schemas';

export const LIST_CAPS = {
  tips: 8,
  takeaways: 8,
  followUps: 4,
  subtopics: 8,
  topicsPerDay: 4,
  questions: 15,
  clarifyingMin: 3,
  clarifyingMax: 5,
  clarifyingOptionsMin: 2,
  clarifyingOptionsMax: 8,
  quizOptionsMin: 2,
  quizOptionsMax: 6,
  scorecardList: 5,
} as const;

export const MINUTES = { min: 15, max: 240, fallback: 60 } as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rounds and clamps; non-finite input becomes `fallback` (also clamped). */
export function clampInt(value: number, min: number, max: number, fallback = min): number {
  const v = Number.isFinite(value) ? Math.round(value) : fallback;
  return clamp(v, min, max);
}

/** Trims, drops empties and case-insensitive duplicates, caps the length. */
export function cleanList(items: readonly string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}

const unusable = (what: string) =>
  new AppError(502, 'AI_ERROR', `The AI returned an unusable ${what}. Please try again.`, undefined, true);

// ---------------------------------------------------------------------------
// Intake (clarifying) questions
// ---------------------------------------------------------------------------

/** Used to pad the list when the model returns fewer than 3 usable questions. */
const FALLBACK_CLARIFYING: Omit<ClarifyingQuestion, 'id'>[] = [
  {
    question: 'Which interview stage are you preparing for?',
    type: 'single',
    options: ['Recruiter / phone screen', 'First technical round', 'Onsite / final loop', 'Not sure yet'],
    helperText: null,
  },
  {
    question: 'Which areas do you currently feel least confident about?',
    type: 'text',
    options: [],
    helperText: 'A few words is enough, e.g. "concurrency, SQL indexing".',
  },
  {
    question: 'How would you like the plan to balance theory and practice?',
    type: 'single',
    options: ['Mostly concepts', 'Balanced', 'Mostly hands-on practice'],
    helperText: null,
  },
];

export function normalizeIntakeQuestions(raw: IntakeQuestionsOutput): ClarifyingQuestion[] {
  const seen = new Set<string>();
  const out: Omit<ClarifyingQuestion, 'id'>[] = [];
  let textCount = 0;

  const push = (q: Omit<ClarifyingQuestion, 'id'>) => {
    const key = q.question.toLowerCase();
    if (seen.has(key)) return;
    if (q.type === 'text') {
      // Keep the intake quick: at most one free-text question.
      if (textCount >= 1) return;
      textCount++;
    }
    seen.add(key);
    out.push(q);
  };

  for (const q of raw.questions) {
    if (out.length >= LIST_CAPS.clarifyingMax) break;
    const question = q.question.trim();
    if (!question) continue;
    let type = q.type;
    let options = type === 'text' ? [] : cleanList(q.options, LIST_CAPS.clarifyingOptionsMax);
    if (type !== 'text' && options.length < LIST_CAPS.clarifyingOptionsMin) {
      type = 'text';
      options = [];
    }
    push({ question, type, options, helperText: q.helperText.trim() || null });
  }

  for (const fb of FALLBACK_CLARIFYING) {
    if (out.length >= LIST_CAPS.clarifyingMin) break;
    push({ ...fb, options: [...fb.options] });
  }

  return out.slice(0, LIST_CAPS.clarifyingMax).map((q, i) => ({ id: `q${i + 1}`, ...q }));
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

type PlanDay = GeneratedPlan['days'][number];
type PlanTopic = PlanDay['topics'][number];

function normalizeTopic(t: PlanOutput['days'][number]['topics'][number]): PlanTopic | null {
  const title = t.title.trim();
  if (!title) return null;
  return {
    title,
    description: t.description.trim(),
    subtopics: cleanList(t.subtopics, LIST_CAPS.subtopics),
    difficulty: t.difficulty,
    estimatedMinutes: clampInt(t.estimatedMinutes, MINUTES.min, MINUTES.max, MINUTES.fallback),
  };
}

/**
 * Guarantees: days numbered densely 1..n with n <= totalDays (n === totalDays when the model
 * returned enough days), sorted, no duplicate day numbers, every day has 1..4 topics.
 * Throws a retryable AI_ERROR when no usable day remains.
 */
export function normalizePlan(raw: PlanOutput, totalDays: number, fallbackTitle: string): GeneratedPlan {
  const maxDays = Math.max(1, Math.floor(totalDays));

  // 1. Clean topics, drop empty days, remember the original position for a stable sort.
  const cleaned = raw.days
    .map((d, index) => ({
      index,
      dayNumber: Number.isFinite(d.dayNumber) ? d.dayNumber : Number.POSITIVE_INFINITY,
      theme: d.theme.trim(),
      topics: d.topics.map(normalizeTopic).filter((t): t is PlanTopic => t !== null),
    }))
    .filter((d) => d.topics.length > 0)
    .sort((a, b) => a.dayNumber - b.dayNumber || a.index - b.index);

  // 2. Merge days that share a day number (topics are appended, then capped).
  const merged: { dayNumber: number; theme: string; topics: PlanTopic[] }[] = [];
  for (const d of cleaned) {
    const prev = merged.at(-1);
    if (prev && Number.isFinite(d.dayNumber) && prev.dayNumber === d.dayNumber) {
      const titles = new Set(prev.topics.map((t) => t.title.toLowerCase()));
      prev.topics.push(...d.topics.filter((t) => !titles.has(t.title.toLowerCase())));
      if (!prev.theme) prev.theme = d.theme;
    } else {
      merged.push({ dayNumber: d.dayNumber, theme: d.theme, topics: [...d.topics] });
    }
  }
  if (merged.length === 0) throw unusable('study plan');

  // 3. Too many days: keep the first (totalDays - 1) and the final day (usually revision + mock).
  const kept = merged.length > maxDays ? [...merged.slice(0, maxDays - 1), merged.at(-1)!].slice(-maxDays) : merged;

  // 4. Renumber densely and cap topics per day.
  const days: PlanDay[] = kept.map((d, i) => {
    const topics = d.topics.slice(0, LIST_CAPS.topicsPerDay);
    return { dayNumber: i + 1, theme: d.theme || topics[0]!.title, topics };
  });

  return {
    title: raw.title.trim() || fallbackTitle,
    summary: raw.summary.trim(),
    tips: cleanList(raw.tips, LIST_CAPS.tips),
    days,
  };
}

// ---------------------------------------------------------------------------
// Learning doc / questions
// ---------------------------------------------------------------------------

export function normalizeDoc(raw: DocOutput): GeneratedDoc {
  const contentMd = raw.contentMd.trim();
  if (!contentMd) throw unusable('study guide');
  return { contentMd, keyTakeaways: cleanList(raw.keyTakeaways, LIST_CAPS.takeaways) };
}

export function normalizeQuestions(raw: QuestionsOutput): GeneratedQuestion[] {
  const seen = new Set<string>();
  const out: GeneratedQuestion[] = [];
  for (const q of raw.questions) {
    const question = q.question.trim();
    const answerMd = q.answerMd.trim();
    if (!question || !answerMd || seen.has(question.toLowerCase())) continue;
    seen.add(question.toLowerCase());
    out.push({
      question,
      answerMd,
      difficulty: q.difficulty,
      kind: q.kind,
      followUps: cleanList(q.followUps, LIST_CAPS.followUps),
    });
    if (out.length >= LIST_CAPS.questions) break;
  }
  if (out.length === 0) throw unusable('question set');
  return out;
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

type QuizQuestion = GeneratedQuiz['questions'][number];

/** Returns null when the question can't be made valid (bad correctIndex, < 2 options, ...). */
export function normalizeQuizQuestion(q: QuizOutput['questions'][number]): QuizQuestion | null {
  const prompt = q.prompt.trim();
  if (!prompt) return null;
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) return null;

  const correctText = q.options[q.correctIndex]!.trim();
  if (!correctText) return null;

  // Drop empty and duplicate options, always keeping the correct one.
  const seen = new Set<string>([correctText.toLowerCase()]);
  const others: { text: string; index: number }[] = [];
  q.options.forEach((o, index) => {
    const text = o.trim();
    if (index === q.correctIndex || !text || seen.has(text.toLowerCase())) return;
    seen.add(text.toLowerCase());
    others.push({ text, index });
  });

  // Keep at most 5 distractors, preserving the original order of all options.
  const keptOthers = others.slice(0, LIST_CAPS.quizOptionsMax - 1);
  const ordered = [...keptOthers, { text: correctText, index: q.correctIndex }].sort((a, b) => a.index - b.index);
  if (ordered.length < LIST_CAPS.quizOptionsMin) return null;

  return {
    prompt,
    options: ordered.map((o) => o.text),
    correctIndex: ordered.findIndex((o) => o.index === q.correctIndex),
    explanation: q.explanation.trim(),
  };
}

export function normalizeQuiz(raw: QuizOutput, questionCount: number, fallbackTitle: string): GeneratedQuiz {
  const seen = new Set<string>();
  const questions: QuizQuestion[] = [];
  for (const q of raw.questions) {
    const n = normalizeQuizQuestion(q);
    if (!n || seen.has(n.prompt.toLowerCase())) continue;
    seen.add(n.prompt.toLowerCase());
    questions.push(n);
    if (questions.length >= Math.max(1, questionCount)) break;
  }
  if (questions.length === 0) throw unusable('quiz');
  return { title: raw.title.trim() || fallbackTitle, questions };
}

// ---------------------------------------------------------------------------
// Mock interview
// ---------------------------------------------------------------------------

export const DEFAULT_CLOSING_MESSAGE =
  "That's the end of our interview - thanks for your time. Your scorecard will be ready in a moment.";

export function normalizeFeedback(raw: { score: number; comment: string; idealAnswer: string }): MockFeedback {
  return {
    score: clampInt(raw.score, 0, 10, 0),
    comment: raw.comment.trim(),
    idealAnswer: raw.idealAnswer.trim(),
  };
}

export function normalizeEvaluation(
  raw: MockEvaluationOutput,
  isLast: boolean,
): { feedback: MockFeedback; nextMessage: string } {
  const nextMessage = raw.nextMessage.trim();
  if (!nextMessage && !isLast) throw unusable('interviewer reply');
  return { feedback: normalizeFeedback(raw), nextMessage: nextMessage || DEFAULT_CLOSING_MESSAGE };
}

/** Score bands used for consistency checks and by the mock provider. */
export function verdictForScore(overallScore: number): HiringVerdict {
  if (overallScore >= 85) return 'strong_hire';
  if (overallScore >= 70) return 'hire';
  if (overallScore >= 55) return 'lean_hire';
  if (overallScore >= 40) return 'lean_no_hire';
  return 'no_hire';
}

export function normalizeScorecard(raw: ScorecardOutput): MockScorecard {
  const overallScore = clampInt(raw.overallScore, 0, 100, 0);
  // Keep the model's verdict unless it is more than one band away from the score.
  const expected = verdictForScore(overallScore);
  const distance = Math.abs(HIRING_VERDICTS.indexOf(raw.verdict) - HIRING_VERDICTS.indexOf(expected));
  return {
    overallScore,
    verdict: HIRING_VERDICTS.includes(raw.verdict) && distance <= 1 ? raw.verdict : expected,
    summary: raw.summary.trim(),
    strengths: cleanList(raw.strengths, LIST_CAPS.scorecardList),
    improvements: cleanList(raw.improvements, LIST_CAPS.scorecardList),
    recommendedTopics: cleanList(raw.recommendedTopics, LIST_CAPS.scorecardList),
  };
}
