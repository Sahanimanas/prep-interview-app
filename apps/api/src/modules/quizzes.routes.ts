import { Router } from 'express';
import { createRevisionQuizSchema, submitQuizAttemptSchema } from '@preppilot/shared';
import { query, queryOne } from '../db/pool';
import { badRequest, notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limit';
import { parse, uuidParam } from '../middleware/validate';
import { enqueueJob, toJob } from '../jobs/queue';
import {
  QUIZ_SELECT,
  toAttemptResult,
  toQuizDetail,
  toQuizSummary,
  type QuizAttemptRow,
  type QuizQuestionRow,
  type QuizRow,
} from './mappers';
import { assertPlanReady, getOwnedPlan } from './plans.routes';
import { resolveApiKey } from './users';

async function getOwnedQuiz(quizId: string, userId: string): Promise<QuizRow> {
  const quiz = await queryOne<QuizRow>(`${QUIZ_SELECT} WHERE z.id = $1 AND p.user_id = $2`, [quizId, userId]);
  if (!quiz) throw notFound('Quiz');
  return quiz;
}

const loadQuestions = (quizId: string) =>
  query<QuizQuestionRow>('SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index', [quizId]);

export const quizzesRouter = Router();

quizzesRouter.get('/plans/:planId/quizzes', async (req, res) => {
  const userId = currentUserId(req);
  const plan = await getOwnedPlan(uuidParam(req.params.planId, 'plan id'), userId);
  const rows = await query<QuizRow>(`${QUIZ_SELECT} WHERE z.plan_id = $1 ORDER BY z.created_at DESC`, [plan.id]);
  res.json(rows.map(toQuizSummary));
});

// Revision quiz across topics: generated asynchronously; the job's resultId is the new quiz id.
quizzesRouter.post('/plans/:planId/quizzes', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const plan = await getOwnedPlan(uuidParam(req.params.planId, 'plan id'), userId);
  assertPlanReady(plan);
  const input = parse(createRevisionQuizSchema, req.body);
  if (input.topicIds?.length) {
    const owned = await query<{ id: string }>('SELECT id FROM topics WHERE plan_id = $1 AND id = ANY($2::uuid[])', [
      plan.id,
      input.topicIds,
    ]);
    if (owned.length !== new Set(input.topicIds).size) throw badRequest('Some selected topics are not part of this plan');
  }
  await resolveApiKey(userId);
  const job = await enqueueJob({
    userId,
    planId: plan.id,
    kind: 'quiz',
    payload: { topicIds: input.topicIds ?? [], questionCount: input.questionCount },
  });
  res.status(202).json(toJob(job));
});

quizzesRouter.get('/quizzes/:quizId', async (req, res) => {
  const userId = currentUserId(req);
  const quiz = await getOwnedQuiz(uuidParam(req.params.quizId, 'quiz id'), userId);
  const [questions, lastAttempt] = await Promise.all([
    loadQuestions(quiz.id),
    queryOne<QuizAttemptRow>(
      'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
      [quiz.id, userId],
    ),
  ]);
  res.json(toQuizDetail(quiz, questions, lastAttempt));
});

quizzesRouter.post('/quizzes/:quizId/attempts', async (req, res) => {
  const userId = currentUserId(req);
  const quiz = await getOwnedQuiz(uuidParam(req.params.quizId, 'quiz id'), userId);
  const { answers } = parse(submitQuizAttemptSchema, req.body);
  const questions = await loadQuestions(quiz.id);
  if (answers.length !== questions.length) {
    throw badRequest(`Expected ${questions.length} answers, received ${answers.length}`);
  }
  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.correct_index ? 1 : 0), 0);
  const attempt = await queryOne<QuizAttemptRow>(
    `INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, total) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [quiz.id, userId, JSON.stringify(answers), score, questions.length],
  );
  res.status(201).json(toAttemptResult(attempt!, questions));
});
