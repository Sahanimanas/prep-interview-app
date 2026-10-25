import { Router } from 'express';
import { listQuestionsQuerySchema, updateQuestionSchema } from '@preppilot/shared';
import { query, queryOne } from '../db/pool';
import { notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { parse, uuidParam } from '../middleware/validate';
import { QUESTION_SELECT, toQuestion, type QuestionRow } from './mappers';
import { getOwnedPlan } from './plans.routes';

export const questionsRouter = Router();

// GET /plans/:planId/questions?bookmarked=true&topicId=...
questionsRouter.get('/plans/:planId/questions', async (req, res) => {
  const userId = currentUserId(req);
  const plan = await getOwnedPlan(uuidParam(req.params.planId, 'plan id'), userId);
  const filter = parse(listQuestionsQuerySchema, req.query);
  const rows = await query<QuestionRow>(
    `${QUESTION_SELECT}
     WHERE p.id = $1
       AND ($2::boolean IS NULL OR q.bookmarked = $2)
       AND ($3::uuid IS NULL OR q.topic_id = $3)
     ORDER BY t.day_number, t.order_index, q.order_index`,
    [plan.id, filter.bookmarked ?? null, filter.topicId ?? null],
  );
  res.json(rows.map(toQuestion));
});

questionsRouter.patch('/questions/:questionId', async (req, res) => {
  const userId = currentUserId(req);
  const questionId = uuidParam(req.params.questionId, 'question id');
  const input = parse(updateQuestionSchema, req.body);
  const updated = await queryOne<{ id: string }>(
    `UPDATE questions q SET
       bookmarked = COALESCE($3, q.bookmarked),
       confidence = CASE WHEN $4 THEN $5::smallint ELSE q.confidence END
     FROM topics t JOIN plans p ON p.id = t.plan_id
     WHERE q.id = $1 AND t.id = q.topic_id AND p.user_id = $2
     RETURNING q.id`,
    [questionId, userId, input.bookmarked ?? null, input.confidence !== undefined, input.confidence ?? null],
  );
  if (!updated) throw notFound('Question');
  const row = await queryOne<QuestionRow>(`${QUESTION_SELECT} WHERE q.id = $1`, [questionId]);
  res.json(toQuestion(row!));
});
