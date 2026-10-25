/**
 * Output schemas for every AI task, sent to the API as structured-output JSON schemas.
 *
 * Kept deliberately simple so they compile cleanly to structured-outputs JSON schema: plain objects,
 * arrays, strings, numbers and enums only. No min/max/length constraints, no unions, no optional
 * fields. Every range/size rule is enforced afterwards by the normalisers in `./normalize`.
 */
import { z } from 'zod';
import { DIFFICULTIES, HIRING_VERDICTS, QUESTION_KINDS } from '@preppilot/shared';

const difficulty = z.enum(DIFFICULTIES);

export const intakeQuestionsOutput = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['single', 'multi', 'text']),
      /** Concrete answer choices for single/multi; empty array for text. */
      options: z.array(z.string()),
      /** Short hint shown under the question; empty string when none. */
      helperText: z.string(),
    }),
  ),
});
export type IntakeQuestionsOutput = z.infer<typeof intakeQuestionsOutput>;

export const planTopicOutput = z.object({
  title: z.string(),
  description: z.string(),
  subtopics: z.array(z.string()),
  difficulty,
  estimatedMinutes: z.number(),
});

export const planOutput = z.object({
  title: z.string(),
  summary: z.string(),
  tips: z.array(z.string()),
  days: z.array(
    z.object({
      dayNumber: z.number(),
      theme: z.string(),
      topics: z.array(planTopicOutput),
    }),
  ),
});
export type PlanOutput = z.infer<typeof planOutput>;

export const docOutput = z.object({
  contentMd: z.string(),
  keyTakeaways: z.array(z.string()),
});
export type DocOutput = z.infer<typeof docOutput>;

export const questionsOutput = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      answerMd: z.string(),
      difficulty,
      kind: z.enum(QUESTION_KINDS),
      followUps: z.array(z.string()),
    }),
  ),
});
export type QuestionsOutput = z.infer<typeof questionsOutput>;

export const quizOutput = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      prompt: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
  ),
});
export type QuizOutput = z.infer<typeof quizOutput>;

export const mockStartOutput = z.object({
  message: z.string(),
});
export type MockStartOutput = z.infer<typeof mockStartOutput>;

export const mockEvaluationOutput = z.object({
  score: z.number(),
  comment: z.string(),
  idealAnswer: z.string(),
  /** Next question, or a closing remark when this was the last question. */
  nextMessage: z.string(),
});
export type MockEvaluationOutput = z.infer<typeof mockEvaluationOutput>;

export const scorecardOutput = z.object({
  overallScore: z.number(),
  verdict: z.enum(HIRING_VERDICTS),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  recommendedTopics: z.array(z.string()),
});
export type ScorecardOutput = z.infer<typeof scorecardOutput>;
