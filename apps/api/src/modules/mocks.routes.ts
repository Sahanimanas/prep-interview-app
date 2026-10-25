import { Router } from 'express';
import { answerMockSchema, createMockSchema, type MockScorecard } from '@preppilot/shared';
import { ai } from '../ai/service';
import type { MockSetup, TranscriptEntry } from '../ai/types';
import { query, queryOne, withTransaction } from '../db/pool';
import { AppError, badRequest, conflict, notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limit';
import { parse, uuidParam } from '../middleware/validate';
import {
  profileFromPlan,
  toMockDetail,
  toMockSummary,
  topicRef,
  type MockMessageRow,
  type MockRow,
  type PlanRow,
  type TopicRow,
} from './mappers';
import { assertPlanReady, getOwnedPlan } from './plans.routes';
import { resolveApiKey } from './users';

/** When no topics are chosen, give the interviewer a representative sample of the plan. */
const MAX_CONTEXT_TOPICS = 15;

async function getOwnedMock(mockId: string, userId: string): Promise<{ mock: MockRow; plan: PlanRow }> {
  const mock = await queryOne<MockRow>(
    `SELECT m.* FROM mock_interviews m JOIN plans p ON p.id = m.plan_id WHERE m.id = $1 AND p.user_id = $2`,
    [mockId, userId],
  );
  if (!mock) throw notFound('Mock interview');
  const plan = await getOwnedPlan(mock.plan_id, userId);
  return { mock, plan };
}

const loadMessages = (mockId: string) =>
  query<MockMessageRow>('SELECT * FROM mock_messages WHERE mock_id = $1 ORDER BY seq', [mockId]);

const toTranscript = (messages: MockMessageRow[]): TranscriptEntry[] =>
  messages.map((m) => ({ role: m.role, content: m.content, feedback: m.feedback }));

async function detail(mockId: string) {
  const [mock, messages] = await Promise.all([
    queryOne<MockRow>('SELECT * FROM mock_interviews WHERE id = $1', [mockId]),
    loadMessages(mockId),
  ]);
  return toMockDetail(mock!, messages);
}

export const mocksRouter = Router();

mocksRouter.get('/plans/:planId/mocks', async (req, res) => {
  const plan = await getOwnedPlan(uuidParam(req.params.planId, 'plan id'), currentUserId(req));
  const rows = await query<MockRow>('SELECT * FROM mock_interviews WHERE plan_id = $1 ORDER BY created_at DESC', [
    plan.id,
  ]);
  res.json(rows.map(toMockSummary));
});

mocksRouter.post('/plans/:planId/mocks', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const plan = await getOwnedPlan(uuidParam(req.params.planId, 'plan id'), userId);
  assertPlanReady(plan);
  const input = parse(createMockSchema, req.body);

  let selected: TopicRow[] = [];
  if (input.topicIds?.length) {
    selected = await query<TopicRow>(
      'SELECT * FROM topics WHERE plan_id = $1 AND id = ANY($2::uuid[]) ORDER BY day_number, order_index',
      [plan.id, input.topicIds],
    );
    if (selected.length !== new Set(input.topicIds).size) throw badRequest('Some selected topics are not part of this plan');
  }
  const contextTopics = selected.length
    ? selected
    : await query<TopicRow>(
        // Spread the sample across the whole plan rather than only the first days.
        `SELECT * FROM (
           SELECT *, row_number() OVER (ORDER BY day_number, order_index) AS rn, count(*) OVER () AS n
           FROM topics WHERE plan_id = $1
         ) s WHERE n <= $2 OR rn % GREATEST(1, n / $2) = 0
         ORDER BY day_number, order_index LIMIT $2`,
        [plan.id, MAX_CONTEXT_TOPICS],
      );

  const setup: MockSetup = { type: input.type, questionCount: input.questionCount, topics: contextTopics.map(topicRef) };
  const apiKey = await resolveApiKey(userId);
  const { message } = await ai.startMockInterview({ apiKey }, profileFromPlan(plan), setup);

  const mockId = await withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO mock_interviews (plan_id, type, topic_titles, setup, question_count)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [plan.id, input.type, JSON.stringify(selected.map((t) => t.title)), JSON.stringify(setup), input.questionCount],
    );
    const id = rows[0]!.id;
    await db.query(`INSERT INTO mock_messages (mock_id, seq, role, content) VALUES ($1, 1, 'interviewer', $2)`, [
      id,
      message,
    ]);
    return id;
  });
  res.status(201).json(await detail(mockId));
});

mocksRouter.get('/mocks/:mockId', async (req, res) => {
  const { mock } = await getOwnedMock(uuidParam(req.params.mockId, 'mock id'), currentUserId(req));
  res.json(await detail(mock.id));
});

/** Marks an interview finished (no-op if it already completed concurrently). */
async function complete(mock: MockRow, scorecard: MockScorecard | null): Promise<void> {
  await query(
    `UPDATE mock_interviews SET status = 'completed', scorecard = $2, overall_score = $3, completed_at = now()
     WHERE id = $1 AND status = 'in_progress'`,
    [mock.id, scorecard ? JSON.stringify(scorecard) : null, scorecard?.overallScore ?? null],
  );
}

mocksRouter.post('/mocks/:mockId/answer', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const { mock, plan } = await getOwnedMock(uuidParam(req.params.mockId, 'mock id'), userId);
  if (mock.status !== 'in_progress') throw conflict('This mock interview has already finished');
  const { answer } = parse(answerMockSchema, req.body);

  const messages = await loadMessages(mock.id);
  const last = messages.at(-1);
  if (!last || last.role !== 'interviewer') throw conflict('Waiting for the interviewer’s next question');

  const apiKey = await resolveApiKey(userId);
  const profile = profileFromPlan(plan);
  const isLast = mock.answered_count + 1 >= mock.question_count;
  const transcript: TranscriptEntry[] = [...toTranscript(messages), { role: 'candidate', content: answer }];

  // On the final answer the scorecard is generated in parallel with the evaluation (the scorecard
  // judges the full transcript itself), keeping the request well under mobile clients' ~60s timeouts.
  const [{ feedback, nextMessage }, scorecard] = await Promise.all([
    ai.evaluateMockAnswer({ apiKey }, profile, mock.setup, transcript, isLast),
    isLast ? ai.generateMockScorecard({ apiKey }, profile, mock.setup, transcript) : Promise.resolve(null),
  ]);

  await withTransaction(async (db) => {
    const { rowCount } = await db.query(
      `UPDATE mock_interviews SET answered_count = answered_count + 1
       WHERE id = $1 AND answered_count = $2 AND status = 'in_progress'`,
      [mock.id, mock.answered_count],
    );
    if (!rowCount) throw new AppError(409, 'CONFLICT', 'This answer was already submitted');
    const seq = last.seq;
    await db.query(`INSERT INTO mock_messages (mock_id, seq, role, content, feedback) VALUES ($1, $2, 'candidate', $3, $4)`, [
      mock.id,
      seq + 1,
      answer,
      JSON.stringify(feedback),
    ]);
    await db.query(`INSERT INTO mock_messages (mock_id, seq, role, content) VALUES ($1, $2, 'interviewer', $3)`, [
      mock.id,
      seq + 2,
      nextMessage,
    ]);
    if (scorecard) {
      await db.query(
        `UPDATE mock_interviews SET status = 'completed', scorecard = $2, overall_score = $3, completed_at = now()
         WHERE id = $1`,
        [mock.id, JSON.stringify(scorecard), scorecard.overallScore],
      );
    }
  });
  res.json(await detail(mock.id));
});

mocksRouter.post('/mocks/:mockId/end', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const { mock, plan } = await getOwnedMock(uuidParam(req.params.mockId, 'mock id'), userId);
  if (mock.status === 'completed') {
    res.json(await detail(mock.id));
    return;
  }
  let scorecard: MockScorecard | null = null;
  if (mock.answered_count > 0) {
    const apiKey = await resolveApiKey(userId);
    const transcript = toTranscript(await loadMessages(mock.id));
    scorecard = await ai.generateMockScorecard({ apiKey }, profileFromPlan(plan), mock.setup, transcript);
  }
  await complete(mock, scorecard);
  res.json(await detail(mock.id));
});
