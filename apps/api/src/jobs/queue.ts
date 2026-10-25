import type { Job, JobKind, JobStatus } from '@preppilot/shared';
import { pool, query, queryOne, type Queryable } from '../db/pool';

export const JOBS_CHANNEL = 'preppilot_jobs';
/** How long a worker owns a running job before it's considered abandoned and re-queued. */
const LEASE_MINUTES = 15;

export interface JobRow {
  id: string;
  user_id: string;
  plan_id: string;
  topic_id: string | null;
  kind: JobKind;
  status: JobStatus;
  payload: Record<string, unknown>;
  result_id: string | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  created_at: Date;
  updated_at: Date;
}

export function toJob(row: JobRow): Job {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    planId: row.plan_id,
    topicId: row.topic_id,
    resultId: row.result_id,
    error: row.error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface EnqueueInput {
  userId: string;
  planId: string;
  topicId?: string | null;
  kind: JobKind;
  payload?: Record<string, unknown>;
}

/**
 * Enqueue a job. Topic jobs are idempotent: if an active job for the same (topic, kind) exists,
 * that job is returned instead of creating a duplicate.
 */
export async function enqueueJob(input: EnqueueInput, db: Queryable = pool): Promise<JobRow> {
  const inserted = await queryOne<JobRow>(
    `INSERT INTO jobs (user_id, plan_id, topic_id, kind, payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (topic_id, kind) WHERE topic_id IS NOT NULL AND status IN ('queued','running') DO NOTHING
     RETURNING *`,
    [input.userId, input.planId, input.topicId ?? null, input.kind, JSON.stringify(input.payload ?? {})],
    db,
  );
  if (inserted) {
    // Delivered on commit when called inside a transaction.
    await db.query('SELECT pg_notify($1, $2)', [JOBS_CHANNEL, inserted.id]);
    return inserted;
  }
  const active = await queryOne<JobRow>(
    `SELECT * FROM jobs WHERE topic_id = $1 AND kind = $2 AND status IN ('queued','running')`,
    [input.topicId, input.kind],
    db,
  );
  if (!active) throw new Error('Failed to enqueue job');
  return active;
}

/** Atomically claim the next runnable job (safe with many concurrent workers). */
export async function claimNextJob(): Promise<JobRow | null> {
  return queryOne<JobRow>(
    `UPDATE jobs SET status = 'running', attempts = attempts + 1,
            locked_until = now() + make_interval(mins => $1)
     WHERE id = (
       SELECT id FROM jobs
       WHERE status = 'queued' AND run_after <= now()
       ORDER BY run_after, created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`,
    [LEASE_MINUTES],
  );
}

export async function markJobSucceeded(id: string, resultId: string | null = null): Promise<void> {
  await query(
    `UPDATE jobs SET status = 'succeeded', result_id = $2, error = NULL, locked_until = NULL WHERE id = $1`,
    [id, resultId],
  );
}

/** Returns true when the job will be retried, false when it failed permanently. */
export async function markJobFailed(job: JobRow, message: string, retryable: boolean): Promise<boolean> {
  const retry = retryable && job.attempts < job.max_attempts;
  if (retry) {
    // Exponential backoff: 10s, 40s, 90s...
    const delaySeconds = 10 * job.attempts * job.attempts;
    await query(
      `UPDATE jobs SET status = 'queued', error = $2, locked_until = NULL,
              run_after = now() + make_interval(secs => $3)
       WHERE id = $1`,
      [job.id, message, delaySeconds],
    );
  } else {
    await query(`UPDATE jobs SET status = 'failed', error = $2, locked_until = NULL WHERE id = $1`, [job.id, message]);
  }
  return retry;
}

/** Re-queue jobs whose worker died mid-run (lease expired). */
export async function recoverStaleJobs(): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE jobs SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
            error = COALESCE(error, 'Worker stopped before finishing'), locked_until = NULL
     WHERE status = 'running' AND locked_until < now()
     RETURNING id`,
  );
  return rows.length;
}

export async function getJobForUser(jobId: string, userId: string): Promise<JobRow | null> {
  return queryOne<JobRow>('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [jobId, userId]);
}
