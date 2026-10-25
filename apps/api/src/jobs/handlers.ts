import type { JobKind } from '@preppilot/shared';
import { ai } from '../ai/service';
import type { AiContext } from '../ai/types';
import { query, queryOne, withTransaction } from '../db/pool';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { profileFromPlan, topicRef, type PlanRow, type TopicRow } from '../modules/mappers';
import { resolveApiKey } from '../modules/users';
import { enqueueJob, type JobRow } from './queue';

const TOPIC_QUIZ_QUESTIONS = 8;

type PlanOnly = Omit<PlanRow, 'completed_topics' | 'total_topics'>;
type TopicOnly = Omit<TopicRow, 'has_doc' | 'question_count' | 'has_quiz'>;

/** A handler returns the id of the entity it produced (or null). */
type JobHandler = (job: JobRow, ctx: AiContext) => Promise<string | null>;

async function loadPlan(planId: string): Promise<PlanOnly> {
  const plan = await queryOne<PlanOnly>('SELECT * FROM plans WHERE id = $1', [planId]);
  if (!plan) throw new AppError(404, 'NOT_FOUND', 'Plan no longer exists');
  return plan;
}

async function loadTopic(topicId: string | null): Promise<TopicOnly> {
  const topic = topicId ? await queryOne<TopicOnly>('SELECT * FROM topics WHERE id = $1', [topicId]) : null;
  if (!topic) throw new AppError(404, 'NOT_FOUND', 'Topic no longer exists');
  return topic;
}

const generatePlan: JobHandler = async (job, ctx) => {
  const plan = await loadPlan(job.plan_id);
  const generated = await ai.generatePlan(ctx, profileFromPlan(plan));

  await withTransaction(async (db) => {
    await db.query('DELETE FROM topics WHERE plan_id = $1', [plan.id]);
    await db.query('DELETE FROM plan_days WHERE plan_id = $1', [plan.id]);
    const firstDayTopicIds: string[] = [];
    for (const day of generated.days) {
      await db.query('INSERT INTO plan_days (plan_id, day_number, theme) VALUES ($1, $2, $3)', [
        plan.id,
        day.dayNumber,
        day.theme,
      ]);
      for (const [index, topic] of day.topics.entries()) {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO topics (plan_id, day_number, order_index, title, description, subtopics, difficulty, estimated_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            plan.id,
            day.dayNumber,
            index,
            topic.title,
            topic.description,
            JSON.stringify(topic.subtopics),
            topic.difficulty,
            topic.estimatedMinutes,
          ],
        );
        if (day.dayNumber === 1) firstDayTopicIds.push(rows[0]!.id);
      }
    }
    await db.query(
      `UPDATE plans SET title = $2, summary = $3, tips = $4, status = 'ready', error = NULL WHERE id = $1`,
      [plan.id, generated.title, generated.summary, JSON.stringify(generated.tips)],
    );
    // Prefetch day-1 learning docs so the user can start studying immediately.
    for (const topicId of firstDayTopicIds) {
      await enqueueJob({ userId: job.user_id, planId: plan.id, topicId, kind: 'doc' }, db);
    }
  });
  return plan.id;
};

const generateDoc: JobHandler = async (job, ctx) => {
  const topic = await loadTopic(job.topic_id);
  const plan = await loadPlan(topic.plan_id);
  const doc = await ai.generateLearningDoc(ctx, profileFromPlan(plan), topicRef(topic));
  const row = await queryOne<{ id: string }>(
    `INSERT INTO learning_docs (topic_id, content_md, key_takeaways) VALUES ($1, $2, $3)
     ON CONFLICT (topic_id) DO UPDATE
       SET content_md = EXCLUDED.content_md, key_takeaways = EXCLUDED.key_takeaways, created_at = now()
     RETURNING id`,
    [topic.id, doc.contentMd, JSON.stringify(doc.keyTakeaways)],
  );
  return row?.id ?? null;
};

const generateQuestions: JobHandler = async (job, ctx) => {
  const topic = await loadTopic(job.topic_id);
  const plan = await loadPlan(topic.plan_id);
  const questions = await ai.generateQuestions(ctx, profileFromPlan(plan), topicRef(topic));
  await withTransaction(async (db) => {
    await db.query('DELETE FROM questions WHERE topic_id = $1', [topic.id]);
    for (const [index, q] of questions.entries()) {
      await db.query(
        `INSERT INTO questions (topic_id, order_index, question, answer_md, difficulty, kind, follow_ups)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [topic.id, index, q.question, q.answerMd, q.difficulty, q.kind, JSON.stringify(q.followUps)],
      );
    }
  });
  return null;
};

const generateQuiz: JobHandler = async (job, ctx) => {
  const plan = await loadPlan(job.plan_id);
  const profile = profileFromPlan(plan);

  if (job.topic_id) {
    const topic = await loadTopic(job.topic_id);
    const quiz = await ai.generateQuiz(ctx, profile, [topicRef(topic)], TOPIC_QUIZ_QUESTIONS);
    return withTransaction(async (db) => {
      await db.query('DELETE FROM quizzes WHERE topic_id = $1', [topic.id]);
      return insertQuiz(db, plan.id, topic.id, quiz);
    });
  }

  // Revision quiz across several topics.
  const payload = job.payload as { topicIds?: string[]; questionCount?: number };
  const topicIds = payload.topicIds?.length ? payload.topicIds : null;
  const topics = await query<TopicOnly>(
    `SELECT * FROM topics WHERE plan_id = $1 AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
     ORDER BY day_number, order_index`,
    [plan.id, topicIds],
  );
  if (!topics.length) throw new AppError(400, 'VALIDATION_ERROR', 'No topics selected for the quiz');
  const quiz = await ai.generateQuiz(ctx, profile, topics.map(topicRef), payload.questionCount ?? 10);
  return withTransaction((db) => insertQuiz(db, plan.id, null, quiz));
};

async function insertQuiz(
  db: Parameters<Parameters<typeof withTransaction>[0]>[0],
  planId: string,
  topicId: string | null,
  quiz: Awaited<ReturnType<typeof ai.generateQuiz>>,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    'INSERT INTO quizzes (plan_id, topic_id, title) VALUES ($1, $2, $3) RETURNING id',
    [planId, topicId, quiz.title],
  );
  const quizId = rows[0]!.id;
  for (const [index, q] of quiz.questions.entries()) {
    await db.query(
      `INSERT INTO quiz_questions (quiz_id, order_index, prompt, options, correct_index, explanation)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [quizId, index, q.prompt, JSON.stringify(q.options), q.correctIndex, q.explanation],
    );
  }
  return quizId;
}

const handlers: Record<JobKind, JobHandler> = {
  plan: generatePlan,
  doc: generateDoc,
  questions: generateQuestions,
  quiz: generateQuiz,
};

export async function runJob(job: JobRow, signal?: AbortSignal): Promise<string | null> {
  const apiKey = await resolveApiKey(job.user_id);
  const started = Date.now();
  const resultId = await handlers[job.kind](job, { apiKey, signal });
  logger.info({ jobId: job.id, kind: job.kind, ms: Date.now() - started }, 'Job completed');
  return resultId;
}

/** Called once a job has failed for the last time. */
export async function onJobFailedPermanently(job: JobRow, message: string): Promise<void> {
  if (job.kind === 'plan') {
    await queryOne(`UPDATE plans SET status = 'failed', error = $2 WHERE id = $1`, [job.plan_id, message]);
  }
}
