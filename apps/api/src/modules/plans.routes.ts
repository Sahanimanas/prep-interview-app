import { Router } from 'express';
import { createPlanSchema, type PlanDay, type PlanDetail, type PlanStats } from '@preppilot/shared';
import { query, queryOne, withTransaction } from '../db/pool';
import { addDays, clamp, diffDays, todayISO } from '../lib/dates';
import { AppError, notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limit';
import { parse, uuidParam } from '../middleware/validate';
import { enqueueJob, toJob, type JobRow } from '../jobs/queue';
import {
  PLAN_SELECT,
  TOPIC_SELECT,
  toPlan,
  toPlanSummary,
  toTopicSummary,
  type PlanRow,
  type TopicRow,
} from './mappers';
import { resolveApiKey } from './users';

export async function getOwnedPlan(planId: string, userId: string): Promise<PlanRow> {
  const plan = await queryOne<PlanRow>(`${PLAN_SELECT} WHERE p.id = $1 AND p.user_id = $2`, [planId, userId]);
  if (!plan) throw notFound('Plan');
  return plan;
}

export function assertPlanReady(plan: Pick<PlanRow, 'status'>): void {
  if (plan.status !== 'ready') {
    throw new AppError(409, 'CONFLICT', 'This plan is still being generated. Try again in a moment.');
  }
}

export async function buildPlanDetail(planId: string, userId: string): Promise<PlanDetail> {
  const plan = await getOwnedPlan(planId, userId);
  const [topics, dayRows, quizStats, mockStats, planJob] = await Promise.all([
    query<TopicRow>(`${TOPIC_SELECT} WHERE t.plan_id = $1 ORDER BY t.day_number, t.order_index`, [planId]),
    query<{ day_number: number; theme: string }>(
      'SELECT day_number, theme FROM plan_days WHERE plan_id = $1 ORDER BY day_number',
      [planId],
    ),
    queryOne<{ attempts: number; avg_pct: number | null }>(
      `SELECT count(*)::int AS attempts, round(avg(100.0 * a.score / NULLIF(a.total, 0)))::int AS avg_pct
       FROM quiz_attempts a JOIN quizzes z ON z.id = a.quiz_id
       WHERE z.plan_id = $1 AND a.user_id = $2`,
      [planId, userId],
    ),
    queryOne<{ completed: number; avg_score: number | null }>(
      `SELECT count(*)::int AS completed, round(avg(overall_score))::int AS avg_score
       FROM mock_interviews WHERE plan_id = $1 AND status = 'completed'`,
      [planId],
    ),
    queryOne<JobRow>(`SELECT * FROM jobs WHERE plan_id = $1 AND kind = 'plan' ORDER BY created_at DESC LIMIT 1`, [
      planId,
    ]),
  ]);

  const themes = new Map(dayRows.map((d) => [d.day_number, d.theme]));
  const byDay = new Map<number, PlanDay>();
  for (const dayNumber of themes.keys()) {
    byDay.set(dayNumber, {
      dayNumber,
      date: addDays(plan.start_date, dayNumber - 1),
      theme: themes.get(dayNumber) ?? `Day ${dayNumber}`,
      topics: [],
    });
  }
  for (const topic of topics) {
    let day = byDay.get(topic.day_number);
    if (!day) {
      day = {
        dayNumber: topic.day_number,
        date: addDays(plan.start_date, topic.day_number - 1),
        theme: `Day ${topic.day_number}`,
        topics: [],
      };
      byDay.set(topic.day_number, day);
    }
    day.topics.push(toTopicSummary(topic));
  }

  const today = todayISO();
  const stats: PlanStats = {
    completedTopics: plan.completed_topics,
    totalTopics: plan.total_topics,
    quizAttempts: quizStats?.attempts ?? 0,
    averageQuizScore: quizStats?.avg_pct ?? null,
    mocksCompleted: mockStats?.completed ?? 0,
    averageMockScore: mockStats?.avg_score ?? null,
    daysRemaining: diffDays(today, plan.interview_date),
    todayDayNumber: clamp(diffDays(plan.start_date, today) + 1, 1, plan.total_days),
  };

  return {
    plan: toPlan(plan),
    days: [...byDay.values()].sort((a, b) => a.dayNumber - b.dayNumber),
    stats,
    planJob: planJob ? toJob(planJob) : null,
  };
}

export const plansRouter = Router();

plansRouter.get('/', async (req, res) => {
  const rows = await query<PlanRow>(`${PLAN_SELECT} WHERE p.user_id = $1 ORDER BY p.created_at DESC`, [
    currentUserId(req),
  ]);
  res.json(rows.map(toPlanSummary));
});

plansRouter.post('/', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(createPlanSchema, req.body);
  // Fail fast (402) before creating anything when no AI key is available.
  await resolveApiKey(userId);

  const startDate = todayISO();
  const planId = await withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO plans (user_id, title, technology, target_role, years_of_experience, hours_per_day,
         current_level, interview_types, company, focus_areas, notes, clarifying_answers,
         start_date, interview_date, total_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [
        userId,
        `${input.technology} interview prep`,
        input.technology,
        input.targetRole,
        input.yearsOfExperience,
        input.hoursPerDay,
        input.currentLevel,
        input.interviewTypes,
        input.company || null,
        input.focusAreas,
        input.notes || null,
        JSON.stringify(input.clarifyingAnswers.filter((a) => a.answer.length > 0)),
        startDate,
        addDays(startDate, input.daysUntilInterview),
        input.daysUntilInterview,
      ],
    );
    const id = rows[0]!.id;
    await enqueueJob({ userId, planId: id, kind: 'plan' }, db);
    return id;
  });

  res.status(201).json(await buildPlanDetail(planId, userId));
});

plansRouter.get('/:planId', async (req, res) => {
  res.json(await buildPlanDetail(uuidParam(req.params.planId, 'plan id'), currentUserId(req)));
});

plansRouter.post('/:planId/retry', aiLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const plan = await getOwnedPlan(uuidParam(req.params.planId, 'plan id'), userId);
  if (plan.status !== 'failed') throw new AppError(409, 'CONFLICT', 'Only failed plans can be retried');
  await resolveApiKey(userId);
  await withTransaction(async (db) => {
    await db.query(`UPDATE plans SET status = 'generating', error = NULL WHERE id = $1`, [plan.id]);
    await enqueueJob({ userId, planId: plan.id, kind: 'plan' }, db);
  });
  res.json(await buildPlanDetail(plan.id, userId));
});

plansRouter.delete('/:planId', async (req, res) => {
  const rows = await query('DELETE FROM plans WHERE id = $1 AND user_id = $2 RETURNING id', [
    uuidParam(req.params.planId, 'plan id'),
    currentUserId(req),
  ]);
  if (!rows.length) throw notFound('Plan');
  res.status(204).end();
});
