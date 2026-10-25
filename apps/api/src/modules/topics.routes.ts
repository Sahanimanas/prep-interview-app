import { Router } from 'express';
import {
  generateTopicContentSchema,
  updateTopicSchema,
  type TopicContentKind,
  type TopicDetail,
} from '@preppilot/shared';
import { query, queryOne } from '../db/pool';
import { AppError, notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limit';
import { parse, uuidParam } from '../middleware/validate';
import { enqueueJob, toJob, type JobRow } from '../jobs/queue';
import {
  QUESTION_SELECT,
  QUIZ_SELECT,
  TOPIC_SELECT,
  toDoc,
  toQuestion,
  toQuizDetail,
  toTopicSummary,
  type DocRow,
  type QuestionRow,
  type QuizAttemptRow,
  type QuizQuestionRow,
  type QuizRow,
  type TopicRow,
} from './mappers';
import { resolveApiKey } from './users';

async function getOwnedTopic(topicId: string, userId: string): Promise<TopicRow & { plan_status: string }> {
  const topic = await queryOne<TopicRow & { plan_status: string }>(
    `${TOPIC_SELECT.replace('FROM topics t', 'FROM topics t JOIN plans p ON p.id = t.plan_id')}
     WHERE t.id = $1 AND p.user_id = $2`.replace('SELECT t.*,', 'SELECT t.*, p.status AS plan_status,'),
    [topicId, userId],
  );
  if (!topic) throw notFound('Topic');
  return topic;
}

async function buildTopicDetail(topicId: string, userId: string): Promise<TopicDetail> {
  const topic = await getOwnedTopic(topicId, userId);
  const [doc, questions, quiz, jobs] = await Promise.all([
    queryOne<DocRow>('SELECT * FROM learning_docs WHERE topic_id = $1', [topicId]),
    query<QuestionRow>(`${QUESTION_SELECT} WHERE q.topic_id = $1 ORDER BY q.order_index`, [topicId]),
    queryOne<QuizRow>(`${QUIZ_SELECT} WHERE z.topic_id = $1`, [topicId]),
    query<JobRow>(
      `SELECT DISTINCT ON (kind) * FROM jobs WHERE topic_id = $1 ORDER BY kind, created_at DESC`,
      [topicId],
    ),
  ]);

  let quizDetail: TopicDetail['quiz'] = null;
  if (quiz) {
    const [quizQuestions, lastAttempt] = await Promise.all([
      query<QuizQuestionRow>('SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index', [quiz.id]),
      queryOne<QuizAttemptRow>(
        'SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1',
        [quiz.id, userId],
      ),
    ]);
    quizDetail = toQuizDetail(quiz, quizQuestions, lastAttempt);
  }

  const jobMap: TopicDetail['jobs'] = {};
  for (const job of jobs) {
    if (job.kind !== 'plan') jobMap[job.kind as TopicContentKind] = toJob(job);
  }

  return {
    topic: toTopicSummary(topic),
    doc: doc ? toDoc(doc) : null,
    questions: questions.map(toQuestion),
    quiz: quizDetail,
    jobs: jobMap,
  };
}

export const topicsRouter = Router();

topicsRouter.get('/:topicId', async (req, res) => {
  res.json(await buildTopicDetail(uuidParam(req.params.topicId, 'topic id'), currentUserId(req)));
});

topicsRouter.patch('/:topicId', async (req, res) => {
  const userId = currentUserId(req);
  const topicId = uuidParam(req.params.topicId, 'topic id');
  const { status } = parse(updateTopicSchema, req.body);
  await getOwnedTopic(topicId, userId);
  await query(
    `UPDATE topics SET status = $2,
       completed_at = CASE WHEN $2 = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END
     WHERE id = $1`,
    [topicId, status],
  );
  const topic = await getOwnedTopic(topicId, userId);
  res.json(toTopicSummary(topic));
});

topicsRouter.post('/:topicId/generate', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const topicId = uuidParam(req.params.topicId, 'topic id');
  const { kind, regenerate } = parse(generateTopicContentSchema, req.body);
  const topic = await getOwnedTopic(topicId, userId);
  if (topic.plan_status !== 'ready') throw new AppError(409, 'CONFLICT', 'The plan is still being generated');

  const exists = kind === 'doc' ? topic.has_doc : kind === 'questions' ? topic.question_count > 0 : topic.has_quiz;
  if (exists && !regenerate) {
    throw new AppError(409, 'CONFLICT', 'This content already exists. Use regenerate to replace it.');
  }
  await resolveApiKey(userId);
  const job = await enqueueJob({ userId, planId: topic.plan_id, topicId, kind });
  res.status(202).json(toJob(job));
});
